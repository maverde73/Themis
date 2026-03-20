import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../l10n/app_localizations.dart';
import '../../pairing/providers/pairing_provider.dart';
import '../../survey/providers/survey_provider.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pairingState = ref.watch(pairingNotifierProvider);
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.appTitle)),
      body: pairingState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('${l10n.error}: $err')),
        data: (isPaired) => isPaired
            ? _PairedView()
            : _UnpairedView(),
      ),
    );
  }
}

class _UnpairedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.qr_code_scanner, size: 80, color: theme.colorScheme.primary),
            const SizedBox(height: 24),
            Text(
              l10n.scanQrDescription,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => context.push('/pairing'),
              icon: const Icon(Icons.qr_code_scanner),
              label: Text(l10n.scanQrCode),
            ),
          ],
        ),
      ),
    );
  }
}

class _PairedView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final surveysAsync = ref.watch(activeSurveysProvider);
    final hasSurveys = surveysAsync.whenOrNull(data: (s) => s.isNotEmpty) ?? false;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.verified_user, size: 64, color: theme.colorScheme.primary),
          const SizedBox(height: 16),
          Text(
            l10n.chooseReportType,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 32),
          _ReportButton(
            icon: Icons.shield,
            label: l10n.reportHarassment,
            subtitle: l10n.reportHarassmentSubtitle,
            color: theme.colorScheme.primary,
            onPressed: () => context.push('/report-pdr'),
          ),
          const SizedBox(height: 16),
          _ReportButton(
            icon: Icons.gavel,
            label: l10n.reportMisconduct,
            subtitle: l10n.reportMisconductSubtitle,
            color: theme.colorScheme.tertiary,
            onPressed: () => context.push('/report-wb'),
          ),
          if (hasSurveys) ...[
            const SizedBox(height: 16),
            _ReportButton(
              icon: Icons.assignment,
              label: l10n.fillSurvey,
              subtitle: l10n.fillSurveySubtitle,
              color: theme.colorScheme.secondary,
              onPressed: () => context.push('/surveys'),
            ),
          ],
        ],
      ),
    );
  }
}

class _ReportButton extends StatelessWidget {
  const _ReportButton({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Icon(icon, size: 40, color: color),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
