import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:styx_crypto_core/styx_crypto_core.dart';

/// Encrypted report envelope.
///
/// Contains everything needed for the recipient to decrypt:
/// - ephemeralPublicKey: X25519 ephemeral public key (32 bytes, hex)
/// - nonce: 12-byte nonce (hex)
/// - ciphertext: ChaCha20-Poly1305 encrypted payload (base64)
/// - signature: Ed25519 signature of the plaintext (64 bytes, hex)
/// - senderPublicKey: Ed25519 public key of sender (32 bytes, hex)
class EncryptedEnvelope {
  const EncryptedEnvelope({
    required this.ephemeralPublicKey,
    required this.nonce,
    required this.ciphertext,
    required this.signature,
    required this.senderPublicKey,
  });

  factory EncryptedEnvelope.fromJson(Map<String, dynamic> json) {
    return EncryptedEnvelope(
      ephemeralPublicKey: json['epk'] as String,
      nonce: json['n'] as String,
      ciphertext: json['ct'] as String,
      signature: json['sig'] as String,
      senderPublicKey: json['spk'] as String,
    );
  }

  final String ephemeralPublicKey;
  final String nonce;
  final String ciphertext;
  final String signature;
  final String senderPublicKey;

  Map<String, dynamic> toJson() => {
        'epk': ephemeralPublicKey,
        'n': nonce,
        'ct': ciphertext,
        'sig': signature,
        'spk': senderPublicKey,
      };

  String toJsonString() => jsonEncode(toJson());
}

/// Encrypts report payloads using X25519 + ChaCha20-Poly1305 + Ed25519 signing.
///
/// Flow:
/// 1. Generate ephemeral X25519 keypair
/// 2. Convert recipient Ed25519 pubkey to X25519
/// 3. DH: ephemeral private + recipient X25519 public → shared secret
/// 4. HKDF: shared secret → symmetric key
/// 5. Encrypt with ChaCha20-Poly1305
/// 6. Sign plaintext with sender's Ed25519 private key
class ReportEncryptor {
  final _dh = DiffieHellman();
  final _kdf = KeyDerivation();
  final _signer = Signer();
  final _keyConverter = KeyConverter();
  final _chacha = Chacha20.poly1305Aead();

  /// Encrypts a JSON report payload for a recipient identified by their Ed25519 public key.
  Future<EncryptedEnvelope> encrypt({
    required Map<String, dynamic> payload,
    required StyxPublicKey recipientEd25519PublicKey,
    required StyxPrivateKey senderPrivateKey,
    required StyxPublicKey senderPublicKey,
  }) async {
    final plaintext = Uint8List.fromList(utf8.encode(jsonEncode(payload)));

    // 1. Generate ephemeral X25519 keypair
    final ephemeral = await _dh.generateEphemeralKeyPair();

    // 2. Convert recipient Ed25519 public key to X25519
    final recipientX25519 =
        _keyConverter.ed25519PublicToX25519(recipientEd25519PublicKey);

    // 3. DH shared secret
    final sharedSecret = await _dh.computeSharedSecret(
      localPrivateKey: ephemeral.privateKey,
      remotePublicKey: recipientX25519,
    );

    // 4. HKDF to derive symmetric key
    final symmetricKey = await _kdf.deriveKey(
      sharedSecret: sharedSecret,
      info: Uint8List.fromList(utf8.encode('themis-report-v1')),
    );

    // 5. Encrypt with ChaCha20-Poly1305
    final secretBox = await _chacha.encrypt(
      plaintext,
      secretKey: SecretKey(symmetricKey),
    );

    // 6. Sign the plaintext
    final signature = await _signer.sign(plaintext, senderPrivateKey);

    // Copy ephemeral public key before destroying
    final ephPubKey = Uint8List.fromList(ephemeral.publicKey);
    ephemeral.destroy();

    return EncryptedEnvelope(
      ephemeralPublicKey: _bytesToHex(ephPubKey),
      nonce: _bytesToHex(Uint8List.fromList(secretBox.nonce)),
      ciphertext: base64Encode(
        Uint8List.fromList([...secretBox.cipherText, ...secretBox.mac.bytes]),
      ),
      signature: _bytesToHex(signature),
      senderPublicKey: senderPublicKey.toHex(),
    );
  }

  String _bytesToHex(Uint8List bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
