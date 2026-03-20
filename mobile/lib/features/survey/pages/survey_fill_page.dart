import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:themis_survey/themis_survey.dart';

import '../../../core/styx/styx_provider.dart';
import '../providers/survey_provider.dart';

class SurveyFillPage extends ConsumerStatefulWidget {
  const SurveyFillPage({super.key, required this.surveyId});

  final String surveyId;

  @override
  ConsumerState<SurveyFillPage> createState() => _SurveyFillPageState();
}

class _SurveyFillPageState extends ConsumerState<SurveyFillPage> {
  bool _alreadyResponded = false;
  bool _checkingResponse = true;

  @override
  void initState() {
    super.initState();
    _checkIfResponded();
  }

  Future<void> _checkIfResponded() async {
    final responded = await hasRespondedToSurvey(widget.surveyId);
    if (mounted) {
      setState(() {
        _alreadyResponded = responded;
        _checkingResponse = false;
      });
    }
  }

  Future<void> _handleSubmit(SurveySubmission submission) async {
    final client = ref.read(surveyApiClientProvider);

    // 1. Submit public answers to server
    await client.submitPublicAnswers(
      surveyId: submission.surveyId,
      answers: submission.publicAnswers,
    );

    // 2. Send private answers via Styx E2E encryption
    if (submission.hasPrivateAnswers) {
      final styx = ref.read(styxServiceProvider);
      if (!styx.isInitialized) await styx.initialize();
      await styx.sendEncrypted(
        channel: 'PDR125',
        payload: {
          'type': 'survey_private_response',
          'surveyId': submission.surveyId,
          'version': submission.version,
          'answers': submission.privateAnswers,
        },
      );
    }

    // 3. Mark as responded on this device
    await markSurveyResponded(submission.surveyId);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Survey submitted successfully')),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingResponse) {
      return Scaffold(
        appBar: AppBar(title: const Text('Survey')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_alreadyResponded) {
      return Scaffold(
        appBar: AppBar(title: const Text('Survey')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.check_circle,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 16),
                const Text(
                  'You have already submitted this survey.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.pop(),
                  child: const Text('Go back'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final surveyAsync = ref.watch(surveyDetailProvider(widget.surveyId));

    return Scaffold(
      appBar: AppBar(
        title: surveyAsync.whenOrNull(data: (s) => Text(s.title)) ??
            const Text('Survey'),
      ),
      body: surveyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
        data: (survey) {
          if (survey.status != 'ACTIVE') {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('This survey is no longer accepting responses.'),
              ),
            );
          }

          return SurveyRenderer(
            surveyId: survey.id,
            version: survey.version,
            schema: survey.schema,
            onSubmit: _handleSubmit,
          );
        },
      ),
    );
  }
}
