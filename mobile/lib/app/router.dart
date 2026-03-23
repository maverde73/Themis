import 'package:go_router/go_router.dart';
import '../features/chat/pages/chat_page.dart';
import '../features/form/pages/form_fill_page.dart';
import '../features/home/pages/home_page.dart';
import '../features/manager_setup/pages/manager_setup_page.dart';
import '../features/pairing/pages/pairing_page.dart';
import '../features/survey/pages/survey_fill_page.dart';
import '../features/survey/pages/survey_list_page.dart';

final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (context, state) => const HomePage()),
    GoRoute(path: '/pairing', builder: (context, state) => const PairingPage()),
    GoRoute(path: '/manager-setup', builder: (context, state) => const ManagerSetupPage()),
    GoRoute(
      path: '/form/:formId',
      builder: (context, state) => FormFillPage(
        formId: state.pathParameters['formId']!,
      ),
    ),
    GoRoute(
      path: '/chat/:reportId',
      builder: (context, state) => ChatPage(
        reportId: state.pathParameters['reportId']!,
        channel: state.uri.queryParameters['channel'] ?? 'WHISTLEBLOWING',
      ),
    ),
    GoRoute(path: '/surveys', builder: (context, state) => const SurveyListPage()),
    GoRoute(
      path: '/survey/:surveyId',
      builder: (context, state) => SurveyFillPage(
        surveyId: state.pathParameters['surveyId']!,
      ),
    ),
  ],
);
