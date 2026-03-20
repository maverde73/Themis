// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Themis';

  @override
  String get scanQrCode => 'Scan QR Code';

  @override
  String get scanQrDescription =>
      'Scan the QR code provided by your organization to get started.';

  @override
  String get chooseReportType => 'Choose the type of report';

  @override
  String get reportHarassment => 'Report harassment';

  @override
  String get reportHarassmentSubtitle => 'PdR 125 — Gender equality';

  @override
  String get reportMisconduct => 'Report misconduct';

  @override
  String get reportMisconductSubtitle => 'Whistleblowing — D.Lgs. 24/2023';

  @override
  String get fillSurvey => 'Fill survey';

  @override
  String get fillSurveySubtitle => 'Anonymous climate assessment';

  @override
  String get secureChat => 'Secure Chat';

  @override
  String get typeMessage => 'Type a message...';

  @override
  String get e2eEncrypted => 'Messages are end-to-end encrypted';

  @override
  String get noMessagesYet => 'No messages yet';

  @override
  String get sendFirstMessage =>
      'Send the first message to start the conversation.';

  @override
  String get confirmReceipt => 'Confirm receipt';

  @override
  String get confirmReceiptDescription =>
      'This will send the legally required acknowledgment to the reporter (art. 5 D.Lgs. 24/2023).\n\nThe reporter will be informed that their report has been received and that they will receive a response within 3 months.';

  @override
  String get sendAcknowledgment => 'Send acknowledgment';

  @override
  String get cancel => 'Cancel';

  @override
  String get surveys => 'Surveys';

  @override
  String get noActiveSurveys => 'No active surveys available.';

  @override
  String get surveySubmitted => 'Survey submitted successfully';

  @override
  String get alreadySubmitted => 'You have already submitted this survey.';

  @override
  String get goBack => 'Go back';

  @override
  String get submit => 'Submit';

  @override
  String get surveyNotAccepting =>
      'This survey is no longer accepting responses.';

  @override
  String get error => 'Error';

  @override
  String get loading => 'Loading...';
}
