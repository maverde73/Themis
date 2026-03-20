import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A single chat message.
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.content,
    required this.isFromReporter,
    required this.timestamp,
  });

  final String id;
  final String content;
  final bool isFromReporter;
  final DateTime timestamp;
}

/// Chat state for a specific report.
class ChatState {
  const ChatState({
    this.messages = const [],
    this.isLoading = false,
    this.error,
  });

  final List<ChatMessage> messages;
  final bool isLoading;
  final String? error;

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    String? error,
  }) =>
      ChatState(
        messages: messages ?? this.messages,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

/// Notifier for bidirectional chat via Styx relay.
class ChatNotifier extends FamilyAsyncNotifier<ChatState, String> {
  @override
  Future<ChatState> build(String reportId) async {
    // TODO: Connect to relay and fetch chat history for this report
    // Messages are encrypted E2E — decrypt locally
    return const ChatState();
  }

  /// Send a message (encrypted with peer's public key).
  Future<void> sendMessage(String content) async {
    final current = state.valueOrNull ?? const ChatState();
    state = AsyncData(current.copyWith(isLoading: true));

    try {
      // TODO: Encrypt message and send via Styx transport
      final newMessage = ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: content,
        isFromReporter: true,
        timestamp: DateTime.now(),
      );

      state = AsyncData(current.copyWith(
        messages: [...current.messages, newMessage],
        isLoading: false,
      ));
    } catch (e) {
      state = AsyncData(current.copyWith(
        isLoading: false,
        error: e.toString(),
      ));
    }
  }
}

final chatNotifierProvider =
    AsyncNotifierProvider.family<ChatNotifier, ChatState, String>(
  ChatNotifier.new,
);
