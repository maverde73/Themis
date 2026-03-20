import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/router.dart';
import 'app/theme.dart';

void main() {
  runApp(const ProviderScope(child: ThemisApp()));
}

class ThemisApp extends StatelessWidget {
  const ThemisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Themis',
      theme: appTheme,
      routerConfig: router,
    );
  }
}
