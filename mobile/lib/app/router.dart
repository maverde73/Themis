import 'package:go_router/go_router.dart';
import '../features/chat/pages/chat_page.dart';
import '../features/home/pages/home_page.dart';
import '../features/manager_setup/pages/manager_setup_page.dart';
import '../features/pairing/pages/pairing_page.dart';
import '../features/report_pdr/pages/report_pdr_page.dart';
import '../features/report_wb/pages/report_wb_page.dart';
import '../features/survey/pages/survey_fill_page.dart';
import '../features/survey/pages/survey_list_page.dart';

final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (context, state) => const HomePage()),
    GoRoute(path: '/pairing', builder: (context, state) => const PairingPage()),
    GoRoute(path: '/manager-setup', builder: (context, state) => const ManagerSetupPage()),
    GoRoute(path: '/report-pdr', builder: (context, state) => const ReportPdrPage()),
    GoRoute(path: '/report-wb', builder: (context, state) => const ReportWbPage()),
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
