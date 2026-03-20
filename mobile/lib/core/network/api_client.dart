import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants.dart';

/// HTTP client for the Themis metadata server.
class ThemisApiClient {
  final _client = http.Client();

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
      headers: {'Content-Type': 'application/json'},
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
