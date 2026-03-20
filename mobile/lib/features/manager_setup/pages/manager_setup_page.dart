import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

import '../../../core/constants.dart';
import '../../pairing/providers/pairing_provider.dart';

/// Manager setup page — scans/enters an invite token to configure RPG/OdV role.
class ManagerSetupPage extends ConsumerStatefulWidget {
  const ManagerSetupPage({super.key});

  @override
  ConsumerState<ManagerSetupPage> createState() => _ManagerSetupPageState();
}

class _ManagerSetupPageState extends ConsumerState<ManagerSetupPage> {
  final _tokenController = TextEditingController();
  bool _loading = false;
  String? _error;

  // Invite info
  String? _orgName;
  String? _role;
  String? _token;
  bool _confirmed = false;

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _lookupInvite() async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/invites/$token'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode != 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(body['error'] ?? 'Invito non valido');
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      setState(() {
        _orgName = data['orgName'] as String;
        _role = data['role'] as String;
        _token = token;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _claimInvite() async {
    if (_token == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // 1. Generate keypair in secure storage
      final keyStore = ref.read(keyStoreProvider);
      var keyPair = await keyStore.getKeyPair();
      keyPair ??= await keyStore.generateAndStoreKeyPair();

      // 2. Send public key to server
      final response = await http.post(
        Uri.parse('$apiBaseUrl/invites/$_token/claim'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'publicKey': keyPair.publicKey.toHex()}),
      );

      if (response.statusCode != 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(body['error'] ?? 'Errore nella configurazione');
      }

      setState(() => _confirmed = true);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Configurazione gestore')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _confirmed
            ? _buildSuccess(theme)
            : _orgName != null
                ? _buildConfirmation(theme)
                : _buildTokenInput(theme),
      ),
    );
  }

  Widget _buildTokenInput(ThemeData theme) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.admin_panel_settings, size: 64, color: theme.colorScheme.primary),
        const SizedBox(height: 24),
        Text(
          'Inserisci il codice di invito',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(
          'Il codice ti è stato inviato dall\'amministratore della tua organizzazione.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        TextField(
          controller: _tokenController,
          decoration: InputDecoration(
            hintText: 'Codice invito (UUID)',
            border: const OutlineInputBorder(),
            errorText: _error,
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _lookupInvite(),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _loading ? null : _lookupInvite,
          child: _loading
              ? const SizedBox(
                  height: 20, width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Verifica invito'),
        ),
      ],
    );
  }

  Widget _buildConfirmation(ThemeData theme) {
    final roleName = _role == 'rpg'
        ? 'RPG (Responsabile Parità di Genere)'
        : 'OdV (Organismo di Vigilanza)';

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.verified_user, size: 64, color: theme.colorScheme.primary),
        const SizedBox(height: 24),
        Text(
          'Conferma configurazione',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall,
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _InfoRow(label: 'Organizzazione', value: _orgName!),
                const Divider(),
                _InfoRow(label: 'Ruolo', value: roleName),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Le chiavi crittografiche verranno generate automaticamente '
          'e salvate in modo sicuro sul tuo dispositivo.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _error!,
              style: TextStyle(color: theme.colorScheme.error, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _loading ? null : _claimInvite,
          child: _loading
              ? const SizedBox(
                  height: 20, width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Conferma e configura'),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => setState(() {
            _orgName = null;
            _role = null;
            _token = null;
            _error = null;
          }),
          child: const Text('Annulla'),
        ),
      ],
    );
  }

  Widget _buildSuccess(ThemeData theme) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.check_circle, size: 80, color: Colors.green),
        const SizedBox(height: 24),
        Text(
          'Configurazione completata!',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(
          'Il tuo dispositivo è configurato come gestore per $_orgName. '
          'Le chiavi crittografiche sono state generate e il portale web è stato aggiornato.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 32),
        FilledButton(
          onPressed: () => context.go('/'),
          child: const Text('Vai alla home'),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          Flexible(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}
