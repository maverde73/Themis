import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:themis_mobile/main.dart';

void main() {
  testWidgets('App renders home page', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ThemisApp()));
    expect(find.text('Themis'), findsOneWidget);
  });
}
