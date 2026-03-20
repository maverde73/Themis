import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../crypto/key_store.dart';
import 'styx_service.dart';

export 'styx_service.dart' show StyxMessage;

/// Global StyxService provider — initialized once after pairing.
final styxServiceProvider = Provider<StyxService>((ref) {
  final keyStore = ThemisKeyStore();
  final service = StyxService(keyStore: keyStore);

  ref.onDispose(() => service.shutdown());

  return service;
});

/// Stream of all incoming Styx messages across channels.
final styxMessagesProvider = StreamProvider<StyxMessage>((ref) {
  final service = ref.watch(styxServiceProvider);
  return service.messages;
});
