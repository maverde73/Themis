import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/report_pdr_provider.dart';

const _categories = <String, String>{
  'molestia_sessuale': 'Sexual harassment',
  'discriminazione_genere': 'Gender discrimination',
  'mobbing': 'Mobbing',
  'linguaggio_offensivo': 'Offensive language',
  'microaggressione': 'Microaggression',
  'disparita_retributiva': 'Pay disparity',
  'altro': 'Other',
};

class ReportPdrPage extends ConsumerStatefulWidget {
  const ReportPdrPage({super.key});

  @override
  ConsumerState<ReportPdrPage> createState() => _ReportPdrPageState();
}

class _ReportPdrPageState extends ConsumerState<ReportPdrPage> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _whenController = TextEditingController();
  final _whereController = TextEditingController();
  final _frequencyController = TextEditingController();
  final _peopleController = TextEditingController();
  final _witnessesController = TextEditingController();
  final _impactController = TextEditingController();
  final _contactController = TextEditingController();

  final _selectedCategories = <String>{};
  bool _wantsContact = false;
  bool _submitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    _whenController.dispose();
    _whereController.dispose();
    _frequencyController.dispose();
    _peopleController.dispose();
    _witnessesController.dispose();
    _impactController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategories.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one category')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final payload = PdrReportPayload(
        category: _selectedCategories.toList(),
        description: _descriptionController.text,
        when: _whenController.text.isNotEmpty ? _whenController.text : null,
        where: _whereController.text.isNotEmpty ? _whereController.text : null,
        frequency: _frequencyController.text.isNotEmpty ? _frequencyController.text : null,
        peopleInvolved: _peopleController.text.isNotEmpty ? _peopleController.text : null,
        witnesses: _witnessesController.text.isNotEmpty ? _witnessesController.text : null,
        impact: _impactController.text.isNotEmpty ? _impactController.text : null,
        wantsContact: _wantsContact,
        contactInfo: _contactController.text.isNotEmpty ? _contactController.text : null,
      );

      await ref.read(reportPdrNotifierProvider.notifier).submit(payload);

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
      appBar: AppBar(title: const Text('Report PdR 125')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Category *', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: _categories.entries.map((e) {
                final selected = _selectedCategories.contains(e.key);
                return FilterChip(
                  label: Text(e.value),
                  selected: selected,
                  onSelected: (val) {
                    setState(() {
                      if (val) {
                        _selectedCategories.add(e.key);
                      } else {
                        _selectedCategories.remove(e.key);
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
              decoration: const InputDecoration(
                labelText: 'When did it happen?',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _whereController,
              decoration: const InputDecoration(
                labelText: 'Where did it happen?',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _frequencyController,
              decoration: const InputDecoration(
                labelText: 'Frequency (one-time, recurring...)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _peopleController,
              decoration: const InputDecoration(
                labelText: 'People involved',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _witnessesController,
              decoration: const InputDecoration(
                labelText: 'Witnesses',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _impactController,
              decoration: const InputDecoration(
                labelText: 'Impact on you',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('I want to be contacted'),
              value: _wantsContact,
              onChanged: (v) => setState(() => _wantsContact = v),
            ),
            if (_wantsContact) ...[
              const SizedBox(height: 8),
              TextFormField(
                controller: _contactController,
                decoration: const InputDecoration(
                  labelText: 'Contact info (anonymous channel)',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Send Report'),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
