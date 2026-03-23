import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/survey/survey.dart';

import '../../../core/models/form_extensions.dart';
import '../../../l10n/app_localizations.dart';
import '../../survey/providers/survey_provider.dart';
import '../providers/form_submit_provider.dart';

class FormFillPage extends ConsumerStatefulWidget {
  const FormFillPage({super.key, required this.formId});

  final String formId;

  @override
  ConsumerState<FormFillPage> createState() => _FormFillPageState();
}

class _FormFillPageState extends ConsumerState<FormFillPage> {
  bool _alreadyResponded = false;
  bool _checkingResponse = true;
  bool _submitting = false;

  String get _deviceLocale =>
      WidgetsBinding.instance.platformDispatcher.locale.languageCode;

  @override
  void initState() {
    super.initState();
    _checkIfResponded();
  }

  Future<void> _checkIfResponded() async {
    final prefs = await SharedPreferences.getInstance();
    final responded = prefs.getBool('survey_responded_${widget.formId}') ?? false;
    if (mounted) {
      setState(() {
        _alreadyResponded = responded;
        _checkingResponse = false;
      });
    }
  }

  Future<void> _handleSubmit(SurveyFetchResult form, SurveySubmission submission) async {
    setState(() => _submitting = true);

    try {
      await ref.read(formSubmitNotifierProvider.notifier).submit(
        form: form,
        submission: submission,
      );

      // Mark as responded for surveys (not encrypted reports)
      if (!form.isEncryptedReport) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('survey_responded_${widget.formId}', true);
      }

      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.surveySubmitted),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        _showErrorDialog(e);
      }
    }
  }

  void _showErrorDialog(Object error) {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.error_outline, color: Colors.red, size: 48),
        title: Text(l10n.error),
        content: Text(
          error.toString().replaceFirst('Exception: ', ''),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = _deviceLocale;

    if (_checkingResponse) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.loading)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final formAsync = ref.watch(surveyDetailProvider(widget.formId));

    return formAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text(l10n.loading)),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (err, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('${l10n.error}: $err')),
      ),
      data: (form) {
        // Only block re-submission for surveys, not encrypted reports
        if (_alreadyResponded && !form.isEncryptedReport) {
          return Scaffold(
            appBar: AppBar(title: Text(form.schema.title.resolve(locale))),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, size: 64,
                        color: Theme.of(context).colorScheme.primary),
                    const SizedBox(height: 16),
                    Text(l10n.alreadySubmitted, textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.pop(),
                      child: Text(l10n.goBack),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        if (!form.isEncryptedReport && form.status != 'ACTIVE') {
          return Scaffold(
            appBar: AppBar(title: Text(form.schema.title.resolve(locale))),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(l10n.surveyNotAccepting),
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(title: Text(form.schema.title.resolve(locale))),
          body: Stack(
            children: [
              SurveyRenderer(
                surveyId: form.id,
                version: form.version,
                schema: form.schema,
                onSubmit: (submission) => _handleSubmit(form, submission),
                submitLabel: l10n.submit,
                locale: locale,
              ),
              if (_submitting)
                Container(
                  color: Colors.black26,
                  child: const Center(
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text('Invio in corso...'),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
