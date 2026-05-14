import { Client } from '@stomp/stompjs';
import API_CONFIG from '../config/api';
import AuthService from './AuthService';

class StompService {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
    this.connectListeners = new Set();
    this.connected = false;
  }

  getBrokerUrl() {
    return `${API_CONFIG.BASE_URL.replace(/^http/, 'ws')}/api/dashboard/ws`;
  }

  ensureClient() {
    const token = AuthService.getAccessToken();

    if (this.client) {
      this.client.configure({
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!this.client.active) this.client.activate();
      return this.client;
    }

    this.client = new Client({
      brokerURL: this.getBrokerUrl(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      splitLargeFrames: true,
      maxWebSocketChunkSize: 16 * 1024,
      onConnect: () => {
        this.connected = true;
        this.resubscribe();
        this.connectListeners.forEach((listener) => listener());
      },
      onDisconnect: () => {
        this.connected = false;
      },
      onStompError: (frame) => {
        console.error('Dashboard STOMP error:', frame.headers.message || frame.body);
      },
      onWebSocketClose: () => {
        this.connected = false;
      }
    });

    this.client.activate();
    return this.client;
  }

  subscribe(topic, handler) {
    const id = `${topic}:${Date.now()}:${Math.random()}`;
    this.subscriptions.set(id, { topic, handler, subscription: null });
    this.ensureClient();

    if (this.connected) {
      this.activateSubscription(id);
    }

    return () => {
      const entry = this.subscriptions.get(id);
      if (entry?.subscription) entry.subscription.unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  onConnect(listener) {
    this.connectListeners.add(listener);
    return () => this.connectListeners.delete(listener);
  }

  activateSubscription(id) {
    const entry = this.subscriptions.get(id);
    if (!entry || entry.subscription || !this.client?.connected) return;

    entry.subscription = this.client.subscribe(entry.topic, (message) => {
      try {
        entry.handler(JSON.parse(message.body));
      } catch (error) {
        console.error(`Failed to handle STOMP message on ${entry.topic}:`, error);
      }
    });
  }

  resubscribe() {
    this.subscriptions.forEach((entry, id) => {
      if (entry.subscription) entry.subscription.unsubscribe();
      entry.subscription = null;
      this.activateSubscription(id);
    });
  }

  disconnect() {
    this.subscriptions.forEach((entry) => entry.subscription?.unsubscribe());
    this.subscriptions.clear();
    this.connected = false;
    if (this.client?.active) this.client.deactivate();
    this.client = null;
  }
}

export default new StompService();
