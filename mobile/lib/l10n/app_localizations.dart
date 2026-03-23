import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_it.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('it'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In it, this message translates to:
  /// **'Themis'**
  String get appTitle;

  /// No description provided for @scanQrCode.
  ///
  /// In it, this message translates to:
  /// **'Scansiona codice QR'**
  String get scanQrCode;

  /// No description provided for @scanQrDescription.
  ///
  /// In it, this message translates to:
  /// **'Scansiona il codice QR fornito dalla tua organizzazione per iniziare.'**
  String get scanQrDescription;

  /// No description provided for @chooseReportType.
  ///
  /// In it, this message translates to:
  /// **'Scegli il tipo di segnalazione'**
  String get chooseReportType;

  /// No description provided for @noActiveForms.
  ///
  /// In it, this message translates to:
  /// **'Nessun modulo disponibile. Contatta la tua organizzazione.'**
  String get noActiveForms;

  /// No description provided for @fillSurvey.
  ///
  /// In it, this message translates to:
  /// **'Compila questionario'**
  String get fillSurvey;

  /// No description provided for @fillSurveySubtitle.
  ///
  /// In it, this message translates to:
  /// **'Valutazione anonima del clima aziendale'**
  String get fillSurveySubtitle;

  /// No description provided for @secureChat.
  ///
  /// In it, this message translates to:
  /// **'Chat sicura'**
  String get secureChat;

  /// No description provided for @typeMessage.
  ///
  /// In it, this message translates to:
  /// **'Scrivi un messaggio...'**
  String get typeMessage;

  /// No description provided for @e2eEncrypted.
  ///
  /// In it, this message translates to:
  /// **'I messaggi sono crittografati end-to-end'**
  String get e2eEncrypted;

  /// No description provided for @noMessagesYet.
  ///
  /// In it, this message translates to:
  /// **'Nessun messaggio'**
  String get noMessagesYet;

  /// No description provided for @sendFirstMessage.
  ///
  /// In it, this message translates to:
  /// **'Invia il primo messaggio per avviare la conversazione.'**
  String get sendFirstMessage;

  /// No description provided for @confirmReceipt.
  ///
  /// In it, this message translates to:
  /// **'Conferma ricezione'**
  String get confirmReceipt;

  /// No description provided for @confirmReceiptDescription.
  ///
  /// In it, this message translates to:
  /// **'Questo invierà la conferma di ricezione prevista dalla legge al segnalante (art. 5 D.Lgs. 24/2023).\n\nIl segnalante sarà informato che la segnalazione è stata ricevuta e che riceverà riscontro entro 3 mesi.'**
  String get confirmReceiptDescription;

  /// No description provided for @sendAcknowledgment.
  ///
  /// In it, this message translates to:
  /// **'Invia conferma'**
  String get sendAcknowledgment;

  /// No description provided for @cancel.
  ///
  /// In it, this message translates to:
  /// **'Annulla'**
  String get cancel;

  /// No description provided for @surveys.
  ///
  /// In it, this message translates to:
  /// **'Questionari'**
  String get surveys;

  /// No description provided for @noActiveSurveys.
  ///
  /// In it, this message translates to:
  /// **'Nessun questionario attivo disponibile.'**
  String get noActiveSurveys;

  /// No description provided for @surveySubmitted.
  ///
  /// In it, this message translates to:
  /// **'Inviato con successo'**
  String get surveySubmitted;

  /// No description provided for @alreadySubmitted.
  ///
  /// In it, this message translates to:
  /// **'Hai già compilato questo questionario.'**
  String get alreadySubmitted;

  /// No description provided for @goBack.
  ///
  /// In it, this message translates to:
  /// **'Torna indietro'**
  String get goBack;

  /// No description provided for @submit.
  ///
  /// In it, this message translates to:
  /// **'Invia'**
  String get submit;

  /// No description provided for @surveyNotAccepting.
  ///
  /// In it, this message translates to:
  /// **'Questo questionario non accetta più risposte.'**
  String get surveyNotAccepting;

  /// No description provided for @error.
  ///
  /// In it, this message translates to:
  /// **'Errore'**
  String get error;

  /// No description provided for @loading.
  ///
  /// In it, this message translates to:
  /// **'Caricamento...'**
  String get loading;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'it'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'it':
      return AppLocalizationsIt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
