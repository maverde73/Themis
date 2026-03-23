import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import '../../../lib/core/survey/survey.dart';

void main() {
  group('QuestionType', () {
    test('round-trip serialization', () {
      for (final type in QuestionType.values) {
        final json = type.toJson();
        final parsed = QuestionType.fromJson(json);
        expect(parsed, equals(type));
      }
    });
  });

  group('BranchCondition', () {
    test('simple condition round-trip', () {
      final condition = BranchCondition(
        field: 'q1',
        op: 'eq',
        value: 'Yes',
      );
      final json = condition.toJson();
      final parsed = BranchCondition.fromJson(json);
      expect(parsed.field, equals('q1'));
      expect(parsed.op, equals('eq'));
      expect(parsed.value, equals('Yes'));
    });

    test('composite condition round-trip', () {
      final condition = BranchCondition(
        all: [
          BranchCondition(field: 'q1', op: 'eq', value: 'Yes'),
          BranchCondition(field: 'q2', op: 'gt', value: 5),
        ],
      );
      final json = condition.toJson();
      final parsed = BranchCondition.fromJson(json);
      expect(parsed.isComposite, isTrue);
      expect(parsed.all!.length, equals(2));
    });
  });

  group('I18nString', () {
    test('plain string from JSON', () {
      final s = I18nString.fromJson('Hello');
      expect(s.resolve(), equals('Hello'));
      expect(s.resolve('it'), equals('Hello'));
    });

    test('i18n map from JSON', () {
      final s = I18nString.fromJson({'it': 'Ciao', 'en': 'Hello'});
      expect(s.resolve('it'), equals('Ciao'));
      expect(s.resolve('en'), equals('Hello'));
    });

    test('fallback chain: locale → en → it → first', () {
      final s = I18nString({'it': 'Ciao', 'de': 'Hallo'});
      // Unknown locale → fallback to 'it'
      expect(s.resolve('fr'), equals('Ciao'));
    });

    test('fallback to en before it', () {
      final s = I18nString({'en': 'Hello', 'it': 'Ciao'});
      expect(s.resolve('fr'), equals('Hello'));
    });

    test('language part extraction', () {
      final s = I18nString({'it': 'Ciao', 'en': 'Hello'});
      expect(s.resolve('it_IT'), equals('Ciao'));
      expect(s.resolve('en-US'), equals('Hello'));
    });

    test('toJson plain string', () {
      final s = I18nString.plain('test');
      expect(s.toJson(), equals('test'));
    });

    test('toJson i18n map', () {
      final s = I18nString({'it': 'Ciao', 'en': 'Hello'});
      expect(s.toJson(), equals({'it': 'Ciao', 'en': 'Hello'}));
    });
  });

  group('I18nOption', () {
    test('plain string from JSON', () {
      final o = I18nOption.fromJson('Red');
      expect(o.value, equals('Red'));
      expect(o.label.resolve(), equals('Red'));
    });

    test('i18n map from JSON', () {
      final o = I18nOption.fromJson({
        'value': 'red',
        'label': {'it': 'Rosso', 'en': 'Red'},
      });
      expect(o.value, equals('red'));
      expect(o.label.resolve('it'), equals('Rosso'));
      expect(o.label.resolve('en'), equals('Red'));
    });

    test('round-trip', () {
      final o = I18nOption.fromJson({
        'value': 'red',
        'label': {'it': 'Rosso', 'en': 'Red'},
      });
      final json = o.toJson();
      final parsed = I18nOption.fromJson(json);
      expect(parsed.value, equals('red'));
      expect(parsed.label.resolve('it'), equals('Rosso'));
    });
  });

  group('SurveyQuestion', () {
    test('round-trip with plain strings (backwards compat)', () {
      final json = {
        'id': 'q1',
        'type': 'choice',
        'label': 'Favorite color?',
        'description': 'Pick one',
        'required': true,
        'options': ['Red', 'Blue', 'Green'],
        'showIf': {'field': 'q0', 'op': 'eq', 'value': 'Yes'},
      };
      final parsed = SurveyQuestion.fromJson(json);
      expect(parsed.id, equals('q1'));
      expect(parsed.type, equals(QuestionType.choice));
      expect(parsed.label.resolve(), equals('Favorite color?'));
      expect(parsed.required, isTrue);
      expect(parsed.optionValues, equals(['Red', 'Blue', 'Green']));
      expect(parsed.showIf, isNotNull);
      expect(parsed.showIf!.field, equals('q0'));
    });

    test('round-trip with i18n objects', () {
      final json = {
        'id': 'q1',
        'type': 'choice',
        'label': {'it': 'Colore preferito?', 'en': 'Favorite color?'},
        'options': [
          {
            'value': 'red',
            'label': {'it': 'Rosso', 'en': 'Red'},
          },
          {
            'value': 'blue',
            'label': {'it': 'Blu', 'en': 'Blue'},
          },
        ],
      };
      final parsed = SurveyQuestion.fromJson(json);
      expect(parsed.label.resolve('it'), equals('Colore preferito?'));
      expect(parsed.label.resolve('en'), equals('Favorite color?'));
      expect(parsed.optionValues, equals(['red', 'blue']));
      expect(parsed.options![0].label.resolve('it'), equals('Rosso'));
    });

    test('round-trip likert question with i18n statements', () {
      final json = {
        'id': 'q2',
        'type': 'likert',
        'label': {'it': 'Valuta questi', 'en': 'Rate these'},
        'statements': [
          {
            'value': 'fair_pay',
            'label': {'it': 'Paga equa', 'en': 'Fair pay'},
          },
          {
            'value': 'good_culture',
            'label': {'it': 'Buona cultura', 'en': 'Good culture'},
          },
        ],
      };
      final parsed = SurveyQuestion.fromJson(json);
      expect(parsed.type, equals(QuestionType.likert));
      expect(parsed.statementValues, equals(['fair_pay', 'good_culture']));
      expect(parsed.statements![0].label.resolve('en'), equals('Fair pay'));
    });
  });

  group('SurveySchema', () {
    test('round-trip full schema with plain strings', () {
      final json = {
        'title': 'Test Survey',
        'description': 'A test',
        'questions': [
          {
            'id': 'q1',
            'type': 'choice',
            'label': 'Q1',
            'options': ['A', 'B'],
          },
          {
            'id': 'q2',
            'type': 'text',
            'label': 'Q2',
            'private': true,
          },
        ],
      };
      final jsonStr = jsonEncode(json);
      final parsed =
          SurveySchema.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
      expect(parsed.title.resolve(), equals('Test Survey'));
      expect(parsed.questions.length, equals(2));
      expect(parsed.questions[1].private, isTrue);
    });

    test('round-trip with i18n and button labels', () {
      final json = {
        'title': {'it': 'Segnalazione', 'en': 'Report'},
        'description': {'it': 'Descrizione', 'en': 'Description'},
        'buttonLabel': {'it': 'Segnala', 'en': 'Report'},
        'buttonDescription': {'it': 'PdR 125', 'en': 'PdR 125'},
        'questions': [
          {
            'id': 'q1',
            'type': 'text',
            'label': {'it': 'Domanda', 'en': 'Question'},
          },
        ],
      };
      final parsed = SurveySchema.fromJson(json);
      expect(parsed.title.resolve('it'), equals('Segnalazione'));
      expect(
        I18nString.fromJson(parsed.metadata?['buttonLabel']).resolve('en'),
        equals('Report'),
      );
      expect(
        I18nString.fromJson(parsed.metadata?['buttonDescription']).resolve('it'),
        equals('PdR 125'),
      );

      // Round-trip
      final serialized = parsed.toJson();
      final reparsed =
          SurveySchema.fromJson(serialized as Map<String, dynamic>);
      expect(reparsed.title.resolve('en'), equals('Report'));
      expect(reparsed.metadata?['buttonLabel'], isNotNull);
    });
  });
}
