import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:styx_crypto_core/styx_crypto_core.dart';
import 'package:styx_transport/styx_transport.dart';

import '../crypto/key_store.dart';
import '../crypto/pairing_data.dart';
import '../crypto/report_encryptor.dart';

/// Lightweight Styx wrapper for MVP.
///
/// Uses NostrTransport directly for relay communication and
/// ReportEncryptor for E2E encryption. Does NOT use the full
/// SovereignLedger dependency tree — that comes post-MVP.
class StyxService {
  StyxService({
    required this.keyStore,
  });

  final ThemisKeyStore keyStore;

  NostrTransport? _rpgTransport;
  NostrTransport? _wbTransport;
  final _encryptor = ReportEncryptor();
  final _keyConverter = KeyConverter();

  StyxKeyPair? _keyPair;
  ThemisPairingData? _pairingData;

  bool _initialized = false;
  bool get isInitialized => _initialized;

  final _incomingMessages = StreamController<StyxMessage>.broadcast();

  /// Stream of incoming decrypted messages from both channels.
  Stream<StyxMessage> get messages => _incomingMessages.stream;

  /// Initializes transport connections to the relay.
  Future<void> initialize() async {
    if (_initialized) return;

    _keyPair = await keyStore.getKeyPair();
    _pairingData = await keyStore.getPairingData();

    if (_keyPair == null || _pairingData == null) return;

    final relayUrls = _pairingData!.relayUrls.isNotEmpty
        ? _pairingData!.relayUrls
        : ['ws://localhost:7777'];

    // Create transport for RPG channel (PdR 125)
    _rpgTransport = await _createTransport(
      relayUrls: relayUrls,
      remotePubkey: _pairingData!.rpgPublicKey,
    );

    // Create transport for WB channel (Whistleblowing)
    _wbTransport = await _createTransport(
      relayUrls: relayUrls,
      remotePubkey: _pairingData!.odvPublicKey,
    );

    _initialized = true;
  }

  Future<NostrTransport> _createTransport({
    required List<String> relayUrls,
    required String remotePubkey,
  }) async {
    final localX25519Private =
        _keyConverter.ed25519PrivateToX25519(_keyPair!.privateKey);
    final remoteX25519Public = _keyConverter.ed25519PublicToX25519(
      StyxPublicKey(_hexToBytes(remotePubkey)),
    );

    final encryptor = NostrEncryptor(
      localPrivateKey: localX25519Private,
      remotePublicKey: remoteX25519Public,
    );
    await encryptor.initialize();

    final relayPool = RelayPool(
      relayUrls: relayUrls,
      factory: (url) => _createWebSocket(url),
    );

    final transport = NostrTransport(
      relayPool: relayPool,
      encryptor: encryptor,
      localPubkey: _keyPair!.publicKey.toHex(),
      remotePubkey: remotePubkey,
    );

    // Listen for incoming messages
    transport.messages.listen(
      (msg) => _handleIncoming(msg, remotePubkey),
      onError: (_) {},
    );

    await transport.connect();
    return transport;
  }

  void _handleIncoming(TransportMessage msg, String channel) {
    try {
      final jsonStr = utf8.decode(msg.payload);
      final data = jsonDecode(jsonStr) as Map<String, dynamic>;
      _incomingMessages.add(StyxMessage(
        id: msg.id,
        senderPubkey: msg.senderPubkey,
        channel: channel,
        data: data,
        timestamp: msg.timestamp,
      ));
    } on Object {
      // Skip malformed messages
    }
  }

  /// Sends an encrypted message on the specified channel.
  Future<void> sendEncrypted({
    required String channel,
    required Map<String, dynamic> payload,
  }) async {
    if (!_initialized || _keyPair == null || _pairingData == null) {
      throw StateError('StyxService not initialized');
    }

    final transport = channel == 'PDR125' ? _rpgTransport : _wbTransport;
    final recipientPubkey = channel == 'PDR125'
        ? _pairingData!.rpgPublicKey
        : _pairingData!.odvPublicKey;

    if (transport == null) throw StateError('Transport not available for $channel');

    final envelope = await _encryptor.encrypt(
      payload: payload,
      recipientEd25519PublicKey: StyxPublicKey(_hexToBytes(recipientPubkey)),
      senderPrivateKey: _keyPair!.privateKey,
      senderPublicKey: _keyPair!.publicKey,
    );

    final msgPayload = Uint8List.fromList(utf8.encode(envelope.toJsonString()));

    await transport.send(TransportMessage(
      id: DateTime.now().microsecondsSinceEpoch.toRadixString(36),
      senderPubkey: _keyPair!.publicKey.toHex(),
      recipientPubkey: recipientPubkey,
      payload: msgPayload,
      timestamp: DateTime.now(),
    ));
  }

  /// Shuts down all connections.
  Future<void> shutdown() async {
    await _rpgTransport?.disconnect();
    await _wbTransport?.disconnect();
    await _incomingMessages.close();
    _initialized = false;
  }

  Uint8List _hexToBytes(String hex) {
    final bytes = Uint8List(hex.length ~/ 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
    }
    return bytes;
  }
}

Future<RelayConnection> _createWebSocket(String url) async {
  final ws = await WebSocket.connect(url);
  return _DartWebSocketConnection(ws);
}

class _DartWebSocketConnection implements RelayConnection {
  _DartWebSocketConnection(this._ws);

  final WebSocket _ws;

  @override
  Stream<String> get messages =>
      _ws.where((e) => e is String).cast<String>().asBroadcastStream();

  @override
  void send(String data) => _ws.add(data);

  @override
  Future<void> close() async => _ws.close();

  @override
  bool get isOpen => _ws.readyState == WebSocket.open;
}

/// A decrypted incoming message from a Styx channel.
class StyxMessage {
  const StyxMessage({
    required this.id,
    required this.senderPubkey,
    required this.channel,
    required this.data,
    required this.timestamp,
  });

  final String id;
  final String senderPubkey;
  final String channel;
  final Map<String, dynamic> data;
  final DateTime timestamp;
}
