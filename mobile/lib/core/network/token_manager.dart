import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../constants.dart';
import '../crypto/pairing_data.dart';

/// Manages anonymous JWT tokens for mobile API calls.
///
/// Tokens are short-lived (5 min) and obtained via HMAC proof using the
/// pairing secret from the QR code. The manager caches the token and
/// automatically refreshes it before expiry.
class TokenManager {
  TokenManager({required this.pairingData, http.Client? client})
      : _client = client ?? http.Client();

  final ThemisPairingData pairingData;
  final http.Client _client;

  String? _cachedToken;
  DateTime? _expiresAt;

  /// Returns a valid anonymous JWT, refreshing if needed.
  ///
  /// Returns null if the org has no pairing secret (legacy QR).
  Future<String?> getToken() async {
    if (pairingData.pairingSecret == null) return null;

    // Refresh 30s before expiry
    if (_cachedToken != null &&
        _expiresAt != null &&
        DateTime.now().isBefore(_expiresAt!.subtract(const Duration(seconds: 30)))) {
      return _cachedToken;
    }

    return _refreshToken();
  }

  Future<String> _refreshToken() async {
    final secret = pairingData.pairingSecret!;
    final timestamp = DateTime.now().toUtc().millisecondsSinceEpoch ~/ 1000;
    final nonce = const Uuid().v4();
    final message = '${pairingData.orgId}|$timestamp|$nonce';

    final hmacSha256 = Hmac(sha256, utf8.encode(secret));
    final digest = hmacSha256.convert(utf8.encode(message));
    final proof = digest.toString(); // hex string

    final response = await _client.post(
      Uri.parse('$apiBaseUrl/auth/anonymous'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'orgId': pairingData.orgId,
        'timestamp': timestamp,
        'nonce': nonce,
        'proof': proof,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to get anonymous token: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    _cachedToken = json['token'] as String;
    // Token expires in 5 min, cache with that expiry
    _expiresAt = DateTime.now().add(const Duration(minutes: 5));

    return _cachedToken!;
  }

  void dispose() => _client.close();
}
