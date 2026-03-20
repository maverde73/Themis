// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Italian (`it`).
class AppLocalizationsIt extends AppLocalizations {
  AppLocalizationsIt([String locale = 'it']) : super(locale);

  @override
  String get appTitle => 'Themis';

  @override
  String get scanQrCode => 'Scansiona codice QR';

  @override
  String get scanQrDescription =>
      'Scansiona il codice QR fornito dalla tua organizzazione per iniziare.';

  @override
  String get chooseReportType => 'Scegli il tipo di segnalazione';

  @override
  String get reportHarassment => 'Segnala molestia';

  @override
  String get reportHarassmentSubtitle => 'PdR 125 — Parità di genere';

  @override
  String get reportMisconduct => 'Segnala illecito';

  @override
  String get reportMisconductSubtitle => 'Whistleblowing — D.Lgs. 24/2023';

  @override
  String get fillSurvey => 'Compila questionario';

  @override
  String get fillSurveySubtitle => 'Valutazione anonima del clima aziendale';

  @override
  String get secureChat => 'Chat sicura';

  @override
  String get typeMessage => 'Scrivi un messaggio...';

  @override
  String get e2eEncrypted => 'I messaggi sono crittografati end-to-end';

  @override
  String get noMessagesYet => 'Nessun messaggio';

  @override
  String get sendFirstMessage =>
      'Invia il primo messaggio per avviare la conversazione.';

  @override
  String get confirmReceipt => 'Conferma ricezione';

  @override
  String get confirmReceiptDescription =>
      'Questo invierà la conferma di ricezione prevista dalla legge al segnalante (art. 5 D.Lgs. 24/2023).\n\nIl segnalante sarà informato che la segnalazione è stata ricevuta e che riceverà riscontro entro 3 mesi.';

  @override
  String get sendAcknowledgment => 'Invia conferma';

  @override
  String get cancel => 'Annulla';

  @override
  String get surveys => 'Questionari';

  @override
  String get noActiveSurveys => 'Nessun questionario attivo disponibile.';

  @override
  String get surveySubmitted => 'Questionario inviato con successo';

  @override
  String get alreadySubmitted => 'Hai già compilato questo questionario.';

  @override
  String get goBack => 'Torna indietro';

  @override
  String get submit => 'Invia';

  @override
  String get surveyNotAccepting =>
      'Questo questionario non accetta più risposte.';

  @override
  String get error => 'Errore';

  @override
  String get loading => 'Caricamento...';
}
