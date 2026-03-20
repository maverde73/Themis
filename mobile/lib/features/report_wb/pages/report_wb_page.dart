import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/report_wb_provider.dart';

const _violationTypes = <String, String>{
  'penale': 'Criminal offence',
  'amministrativo': 'Administrative',
  'contabile': 'Accounting',
  'mog231': 'MOG 231 violation',
  'diritto_ue': 'EU law violation',
  'corruzione': 'Corruption',
  'conflitto_interessi': 'Conflict of interest',
  'danno_ambientale': 'Environmental damage',
  'frode': 'Fraud',
  'altro': 'Other',
};

const _previousReportOptions = <String, String>{
  'prima_volta': 'First time reporting',
  'interno': 'Previously reported internally',
  'anac': 'Previously reported to ANAC',
  'autorita_giudiziaria': 'Previously reported to judicial authority',
};

class ReportWbPage extends ConsumerStatefulWidget {
  const ReportWbPage({super.key});

  @override
  ConsumerState<ReportWbPage> createState() => _ReportWbPageState();
}

class _ReportWbPageState extends ConsumerState<ReportWbPage> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _whenController = TextEditingController();
  final _whereController = TextEditingController();
  final _peopleController = TextEditingController();
  final _witnessesController = TextEditingController();
  final _nameController = TextEditingController();
  final _roleController = TextEditingController();
  final _contactController = TextEditingController();
  final _anonContactController = TextEditingController();

  final _selectedTypes = <String>{};
  String? _previousReport;
  bool _identityRevealed = false;
  bool _submitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    _whenController.dispose();
    _whereController.dispose();
    _peopleController.dispose();
    _witnessesController.dispose();
    _nameController.dispose();
    _roleController.dispose();
    _contactController.dispose();
    _anonContactController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTypes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one violation type')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final payload = WbReportPayload(
        violationType: _selectedTypes.toList(),
        description: _descriptionController.text,
        when: _whenController.text.isNotEmpty ? _whenController.text : null,
        where: _whereController.text.isNotEmpty ? _whereController.text : null,
        peopleInvolved: _peopleController.text.isNotEmpty ? _peopleController.text : null,
        witnessesEvidence: _witnessesController.text.isNotEmpty ? _witnessesController.text : null,
        previousReport: _previousReport,
        identityRevealed: _identityRevealed,
        identityName: _identityRevealed && _nameController.text.isNotEmpty ? _nameController.text : null,
        identityRole: _identityRevealed && _roleController.text.isNotEmpty ? _roleController.text : null,
        identityContact: _identityRevealed && _contactController.text.isNotEmpty ? _contactController.text : null,
        anonymousContact: !_identityRevealed && _anonContactController.text.isNotEmpty ? _anonContactController.text : null,
      );

      await ref.read(reportWbNotifierProvider.notifier).submit(payload);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report sent successfully')),
        );
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report Whistleblowing')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Violation type *', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: _violationTypes.entries.map((e) {
                final selected = _selectedTypes.contains(e.key);
                return FilterChip(
                  label: Text(e.value),
                  selected: selected,
                  onSelected: (val) {
                    setState(() {
                      if (val) {
                        _selectedTypes.add(e.key);
                      } else {
                        _selectedTypes.remove(e.key);
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description *',
                border: OutlineInputBorder(),
              ),
              maxLines: 5,
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _whenController,
              decoration: const InputDecoration(labelText: 'When?', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _whereController,
              decoration: const InputDecoration(labelText: 'Where?', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _peopleController,
              decoration: const InputDecoration(labelText: 'People involved', border: OutlineInputBorder()),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _witnessesController,
              decoration: const InputDecoration(labelText: 'Witnesses / Evidence', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Previous report', border: OutlineInputBorder()),
              initialValue: _previousReport,
              items: _previousReportOptions.entries
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: (v) => setState(() => _previousReport = v),
            ),
            const SizedBox(height: 24),
            const Divider(),
            SwitchListTile(
              title: const Text('Reveal my identity'),
              subtitle: const Text('D.Lgs. 24/2023 protects your identity'),
              value: _identityRevealed,
              onChanged: (v) => setState(() => _identityRevealed = v),
            ),
            if (_identityRevealed) ...[
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _roleController,
                decoration: const InputDecoration(labelText: 'Role / Position', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _contactController,
                decoration: const InputDecoration(labelText: 'Contact info', border: OutlineInputBorder()),
              ),
            ] else ...[
              const SizedBox(height: 8),
              TextFormField(
                controller: _anonContactController,
                decoration: const InputDecoration(
                  labelText: 'Anonymous contact (optional)',
                  helperText: 'A way for the OdV to reach you without knowing your identity',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Send Report'),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
