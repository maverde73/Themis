import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../l10n/app_localizations.dart';
import '../providers/survey_provider.dart';

class SurveyListPage extends ConsumerWidget {
  const SurveyListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveysAsync = ref.watch(activeSurveysProvider);
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.surveys)),
      body: surveysAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('${l10n.error}: $err'),
          ),
        ),
        data: (surveys) {
          if (surveys.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                  l10n.noActiveSurveys,
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
