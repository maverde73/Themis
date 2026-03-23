import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/form_extensions.dart';
import '../../../l10n/app_localizations.dart';
import '../../form/providers/form_list_provider.dart';
import '../../pairing/providers/pairing_provider.dart';

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
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => context.push('/manager-setup'),
              icon: const Icon(Icons.admin_panel_settings),
              label: const Text('Sono un gestore (RPG/OdV)'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Map of icon name strings (from the server) to Material Icons.
const _iconMap = <String, IconData>{
  'shield': Icons.shield,
  'gavel': Icons.gavel,
  'assignment': Icons.assignment,
  'report': Icons.report,
  'warning': Icons.warning,
  'security': Icons.security,
  'lock': Icons.lock,
  'flag': Icons.flag,
  'person': Icons.person,
  'group': Icons.group,
};

IconData _resolveIcon(String? iconName) {
  if (iconName == null) return Icons.description;
  return _iconMap[iconName] ?? Icons.description;
}

class _PairedView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final formsAsync = ref.watch(activeFormsProvider);
    final locale = WidgetsBinding.instance.platformDispatcher.locale.languageCode;

    return formsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('${l10n.error}: $err')),
      data: (forms) {
        if (forms.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified_user, size: 64, color: theme.colorScheme.primary),
                  const SizedBox(height: 16),
                  Text(
                    l10n.noActiveForms,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
          );
        }

        // Separate encrypted reports (have channel) and surveys (no channel)
        final reports = forms.where((f) => f.isEncryptedReport).toList();
        final surveys = forms.where((f) => !f.isEncryptedReport).toList();

        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.verified_user, size: 64, color: theme.colorScheme.primary),
              const SizedBox(height: 16),
              if (reports.isNotEmpty)
                Text(
                  l10n.chooseReportType,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall,
                ),
              const SizedBox(height: 24),

              // Dynamic report buttons
              for (final form in reports) ...[
                _ReportButton(
                  icon: _resolveIcon(form.icon),
                  label: form.schema?.buttonLabel?.resolve(locale)
                      ?? form.schema?.title.resolve(locale)
                      ?? form.title,
                  subtitle: form.schema?.buttonDescription?.resolve(locale)
                      ?? form.schema?.description?.resolve(locale)
                      ?? form.description
                      ?? '',
                  color: form.channel == 'PDR125'
                      ? theme.colorScheme.primary
                      : theme.colorScheme.tertiary,
                  onPressed: () => context.push('/form/${form.id}'),
                ),
                const SizedBox(height: 16),
              ],

              // Dynamic survey buttons
              for (final form in surveys) ...[
                _ReportButton(
                  icon: _resolveIcon(form.icon ?? 'assignment'),
                  label: form.schema?.buttonLabel?.resolve(locale)
                      ?? form.schema?.title.resolve(locale)
                      ?? form.title,
                  subtitle: form.schema?.buttonDescription?.resolve(locale)
                      ?? form.schema?.description?.resolve(locale)
                      ?? form.description
                      ?? '',
                  color: theme.colorScheme.secondary,
                  onPressed: () => context.push('/form/${form.id}'),
                ),
                const SizedBox(height: 16),
              ],
            ],
          ),
        );
      },
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
