import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../network/token_manager.dart';
import '../models/survey_schema.dart';

/// Fetches survey schemas from the server and submits public answers.
class SurveyApiClient {
  SurveyApiClient({
    required this.baseUrl,
    this.tokenManager,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final TokenManager? tokenManager;
  final http.Client _client;

  Future<Map<String, String>> _authHeaders() async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final token = await tokenManager?.getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
      headers['X-Anon'] = 'true';
    }
    return headers;
  }

  /// Fetches survey schema by ID.
  Future<SurveyFetchResult> fetchSurvey(String surveyId) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/surveys/$surveyId'),
      headers: await _authHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch survey: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return SurveyFetchResult.fromJson(json);
  }

  /// Lists active surveys for an organization.
  Future<List<SurveyListItem>> listActiveSurveys(String orgId) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/surveys/active?org_id=$orgId'),
      headers: await _authHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to list surveys: ${response.body}');
    }

    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((e) => SurveyListItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Submits public answers to the server (anonymous).
  Future<void> submitPublicAnswers({
    required String surveyId,
    required Map<String, dynamic> answers,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/surveys/$surveyId/responses'),
      headers: await _authHeaders(),
      body: jsonEncode({'answers': answers}),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to submit response: ${response.body}');
    }
  }

  void dispose() => _client.close();
}

class SurveyFetchResult {
  const SurveyFetchResult({
    required this.id,
    required this.title,
    required this.version,
    required this.status,
    required this.schema,
    this.extras,
  });

  factory SurveyFetchResult.fromJson(Map<String, dynamic> json) {
    const coreKeys = {'id', 'title', 'version', 'status', 'schema'};
    final extra = Map<String, dynamic>.from(json)
      ..removeWhere((k, _) => coreKeys.contains(k));
    return SurveyFetchResult(
      id: json['id'] as String,
      title: json['title'] as String,
      version: json['version'] as int,
      status: json['status'] as String,
      schema: SurveySchema.fromJson(json['schema'] as Map<String, dynamic>),
      extras: extra.isNotEmpty ? extra : null,
    );
  }

  final String id;
  final String title;
  final int version;
  final String status;
  final SurveySchema schema;
  final Map<String, dynamic>? extras;
}

class SurveyListItem {
  const SurveyListItem({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    this.schema,
    this.extras,
  });

  factory SurveyListItem.fromJson(Map<String, dynamic> json) {
    const coreKeys = {'id', 'title', 'description', 'status', 'schema'};
    final extra = Map<String, dynamic>.from(json)
      ..removeWhere((k, _) => coreKeys.contains(k));
    return SurveyListItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String,
      schema: json['schema'] != null
          ? SurveySchema.fromJson(json['schema'] as Map<String, dynamic>)
          : null,
      extras: extra.isNotEmpty ? extra : null,
    );
  }

  final String id;
  final String title;
  final String? description;
  final String status;
  final SurveySchema? schema;
  final Map<String, dynamic>? extras;
}
