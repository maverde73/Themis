import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/styx/styx_provider.dart';

/// A single chat message.
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.text,
    required this.isFromMe,
    required this.timestamp,
  });

  final String id;
  final String text;
  final bool isFromMe;
  final DateTime timestamp;
}

/// Parameters for a chat session.
class ChatParams {
  const ChatParams({required this.reportId, required this.channel});

  final String reportId;

  /// 'PDR125' or 'WHISTLEBLOWING'
  final String channel;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatParams &&
          reportId == other.reportId &&
          channel == other.channel;

  @override
  int get hashCode => Object.hash(reportId, channel);
}

/// Chat state for a specific report.
class ChatState {
  const ChatState({
    this.messages = const [],
    this.isSending = false,
    this.error,
  });

  final List<ChatMessage> messages;
  final bool isSending;
  final String? error;

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isSending,
    String? error,
  }) =>
      ChatState(
        messages: messages ?? this.messages,
        isSending: isSending ?? this.isSending,
        error: error,
      );
}

/// Notifier for bidirectional chat via Styx relay.
class ChatNotifier extends FamilyAsyncNotifier<ChatState, ChatParams> {
  StreamSubscription<StyxMessage>? _subscription;

  @override
  Future<ChatState> build(ChatParams arg) async {
    final styx = ref.read(styxServiceProvider);

    if (!styx.isInitialized) {
      await styx.initialize();
    }

    // Subscribe to incoming messages for this report
    _subscription = styx.messages.listen((msg) {
      if (msg.data['type'] == 'message' &&
          msg.data['parent_event_id'] == arg.reportId) {
        final text = msg.data['text'] as String? ?? '';
        final incoming = ChatMessage(
          id: msg.id,
          text: text,
          isFromMe: false,
          timestamp: msg.timestamp,
        );
        final current = state.valueOrNull ?? const ChatState();
        state = AsyncData(current.copyWith(
          messages: [...current.messages, incoming],
        ));
      }
    });

    ref.onDispose(() => _subscription?.cancel());

    return const ChatState();
  }

  /// Send a chat message encrypted via Styx.
  Future<void> sendMessage(String text) async {
    final current = state.valueOrNull ?? const ChatState();
    state = AsyncData(current.copyWith(isSending: true, error: null));

    try {
      final styx = ref.read(styxServiceProvider);

      await styx.sendEncrypted(
        channel: arg.channel,
        payload: {
          'type': 'message',
          'parent_event_id': arg.reportId,
          'text': text,
        },
      );

      final sent = ChatMessage(
        id: DateTime.now().microsecondsSinceEpoch.toRadixString(36),
        text: text,
        isFromMe: true,
        timestamp: DateTime.now(),
      );

      state = AsyncData(current.copyWith(
        messages: [...current.messages, sent],
        isSending: false,
      ));
    } catch (e) {
      state = AsyncData(current.copyWith(
        isSending: false,
        error: e.toString(),
      ));
    }
  }

  /// Sends the WB acknowledgment (art. 5 D.Lgs. 24/2023).
  Future<void> sendAcknowledgment() async {
    await sendMessage(
      'La sua segnalazione è stata ricevuta e presa in carico. '
      'Riceverà riscontro entro 3 mesi dalla data odierna, '
      "ai sensi dell'art. 5 del D.Lgs. 24/2023.",
    );
  }
}

final chatNotifierProvider =
    AsyncNotifierProvider.family<ChatNotifier, ChatState, ChatParams>(
  ChatNotifier.new,
);
