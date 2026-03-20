import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/survey_provider.dart';

class SurveyListPage extends ConsumerWidget {
  const SurveyListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveysAsync = ref.watch(activeSurveysProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Surveys')),
      body: surveysAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Error loading surveys: $err'),
          ),
        ),
        data: (surveys) {
          if (surveys.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'No active surveys available.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: surveys.length,
            itemBuilder: (context, index) {
              final survey = surveys[index];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.assignment),
                  title: Text(survey.title),
                  subtitle: survey.description != null
                      ? Text(
                          survey.description!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        )
                      : null,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/survey/${survey.id}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
