import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants.dart';
import 'token_manager.dart';

/// HTTP client for the Themis metadata server.
class ThemisApiClient {
  ThemisApiClient({this.tokenManager});

  final _client = http.Client();
  final TokenManager? tokenManager;

  Future<Map<String, String>> _authHeaders() async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final token = await tokenManager?.getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
      headers['X-Anon'] = 'true';
    }
    return headers;
  }

  /// Posts report metadata to the server.
  ///
  /// Sends ONLY org_id, channel, and received_at — no content, no category,
  /// no identity flags. Those are enriched by the manager after decryption.
  Future<Map<String, dynamic>> postReportMetadata({
    required String orgId,
    required String channel,
  }) async {
    final response = await _client.post(
      Uri.parse('$apiBaseUrl/reports/metadata'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'orgId': orgId,
        'channel': channel,
        'receivedAt': DateTime.now().toUtc().toIso8601String(),
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to post metadata: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  void dispose() => _client.close();
}
