import 'package:flutter/material.dart';

import '../logic/branch_evaluator.dart';
import '../logic/response_partitioner.dart';
import '../logic/survey_validator.dart';
import '../models/question_type.dart';
import '../models/survey_question.dart';
import '../models/survey_schema.dart';
import '../models/survey_submission.dart';
import 'question_widgets.dart';

/// Callback for when the survey is submitted.
typedef OnSurveySubmit = Future<void> Function(SurveySubmission submission);

/// Renders a complete survey form from a [SurveySchema].
///
/// Features:
/// - Reactive branching (questions show/hide based on answers)
/// - Progress bar
/// - Validation of required visible fields
/// - Partitions answers into public/private on submission
/// - i18n: resolves labels in the given [locale]
class SurveyRenderer extends StatefulWidget {
  const SurveyRenderer({
    super.key,
    required this.surveyId,
    required this.version,
    required this.schema,
    required this.onSubmit,
    this.submitLabel = 'Submit',
    this.locale,
  });

  final String surveyId;
  final int version;
  final SurveySchema schema;
  final OnSurveySubmit onSubmit;
  final String submitLabel;

  /// Locale used to resolve i18n labels. If null, uses default resolution.
  final String? locale;

  @override
  State<SurveyRenderer> createState() => _SurveyRendererState();
}

class _SurveyRendererState extends State<SurveyRenderer> {
  final _answers = <String, dynamic>{};
  final _branchEvaluator = BranchEvaluator();
  final _partitioner = ResponsePartitioner();
  final _validator = SurveyValidator();
  final _errors = <String, String>{};
  final _questionKeys = <String, GlobalKey>{};
  bool _submitting = false;

  GlobalKey _keyFor(String questionId) =>
      _questionKeys.putIfAbsent(questionId, GlobalKey.new);

  Set<String> get _visibleIds =>
      _branchEvaluator.visibleQuestionIds(widget.schema, _answers);

  double get _progress {
    final visible = _visibleIds;
    if (visible.isEmpty) return 0;
    final answered = _answers.keys.where(visible.contains).length;
    return answered / visible.length;
  }

  void _updateAnswer(String questionId, dynamic value) {
    setState(() {
      _answers[questionId] = value;
      _errors.remove(questionId);
    });
  }

  Future<void> _submit() async {
    debugPrint('[SurveyRenderer] _submit called, answers: ${_answers.keys.toList()}');
    final visibleIds = _visibleIds;
    debugPrint('[SurveyRenderer] visible questions: $visibleIds');
    final cleanedAnswers = _branchEvaluator.cleanHiddenAnswers(
      widget.schema,
      _answers,
    );

    final validationErrors = _validator.validate(
      schema: widget.schema,
      answers: cleanedAnswers,
      visibleQuestionIds: visibleIds,
    );

    if (validationErrors.isNotEmpty) {
      debugPrint('[SurveyRenderer] validation failed: ${validationErrors.map((e) => '${e.questionId}: ${e.message}').toList()}');
      setState(() {
        _errors.clear();
        for (final err in validationErrors) {
          _errors[err.questionId] = err.message;
        }
      });
      // Scroll to the first error
      final firstErrorId = validationErrors.first.questionId;
      final key = _questionKeys[firstErrorId];
      if (key?.currentContext != null) {
        Scrollable.ensureVisible(
          key!.currentContext!,
          duration: const Duration(milliseconds: 300),
          alignment: 0.1,
        );
      }
      return;
    }

    debugPrint('[SurveyRenderer] validation passed, submitting...');
    setState(() => _submitting = true);

    try {
      final submission = _partitioner.partition(
        surveyId: widget.surveyId,
        version: widget.version,
        schema: widget.schema,
        answers: cleanedAnswers,
      );
      debugPrint('[SurveyRenderer] calling onSubmit with ${submission.publicAnswers.length} public, ${submission.privateAnswers.length} private answers');
      await widget.onSubmit(submission);
      debugPrint('[SurveyRenderer] onSubmit completed successfully');
    } catch (e) {
      debugPrint('[SurveyRenderer] onSubmit error: $e');
      rethrow;
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visibleIds = _visibleIds;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Progress bar
        LinearProgressIndicator(value: _progress),
        const SizedBox(height: 16),

        // Questions
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: widget.schema.questions.length,
            itemBuilder: (context, index) {
              final question = widget.schema.questions[index];
              if (!visibleIds.contains(question.id)) {
                return const SizedBox.shrink();
              }
              return KeyedSubtree(
                key: _keyFor(question.id),
                child: _buildQuestion(question),
              );
            },
          ),
        ),

        // Submit button
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.submitLabel),
          ),
        ),
      ],
    );
  }

  Widget _buildQuestion(SurveyQuestion question) {
    final locale = widget.locale;

    if (question.type == QuestionType.section) {
      return SectionWidget(question: question, locale: locale);
    }

    final error = _errors[question.id];

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label
          Row(
            children: [
              Expanded(
                child: Text(
                  question.label.resolve(locale),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              if (question.required)
                Text(' *',
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error)),
            ],
          ),
          if (question.description != null &&
              question.type != QuestionType.text &&
              question.type != QuestionType.longText)
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 8),
              child: Text(
                question.description!.resolve(locale),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          const SizedBox(height: 8),

          // Question widget
          _buildQuestionWidget(question),

          // Error
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                error,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQuestionWidget(SurveyQuestion question) {
    final answer = _answers[question.id];
    final locale = widget.locale;

    switch (question.type) {
      case QuestionType.choice:
        return ChoiceQuestionWidget(
          question: question,
          value: answer as String?,
          onChanged: (v) => _updateAnswer(question.id, v),
          locale: locale,
        );
      case QuestionType.multiChoice:
        return MultiChoiceQuestionWidget(
          question: question,
          value: (answer as List<String>?) ?? [],
          onChanged: (v) => _updateAnswer(question.id, v),
          locale: locale,
        );
      case QuestionType.text:
        return TextQuestionWidget(
          question: question,
          value: answer as String?,
          onChanged: (v) => _updateAnswer(question.id, v),
          locale: locale,
        );
      case QuestionType.longText:
        return TextQuestionWidget(
          question: question,
          value: answer as String?,
          onChanged: (v) => _updateAnswer(question.id, v),
          maxLines: 5,
          locale: locale,
        );
      case QuestionType.rating:
        return RatingQuestionWidget(
          question: question,
          value: answer as int?,
          onChanged: (v) => _updateAnswer(question.id, v),
          locale: locale,
        );
      case QuestionType.nps:
        return NpsQuestionWidget(
          question: question,
          value: answer as int?,
          onChanged: (v) => _updateAnswer(question.id, v),
        );
      case QuestionType.likert:
        return LikertQuestionWidget(
          question: question,
          value: (answer as Map<String, dynamic>?) ?? {},
          onChanged: (v) => _updateAnswer(question.id, v),
          locale: locale,
        );
      case QuestionType.date:
        return DateQuestionWidget(
          question: question,
          value: answer as String?,
          onChanged: (v) => _updateAnswer(question.id, v),
        );
      case QuestionType.ranking:
        return RankingQuestionWidget(
          question: question,
          value: (answer as List<String>?) ?? [],
          onChanged: (v) => _updateAnswer(question.id, v),
          locale: locale,
        );
      case QuestionType.section:
        return SectionWidget(question: question, locale: locale);
    }
  }
}
