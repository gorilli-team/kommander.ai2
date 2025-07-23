import { ObjectId } from 'mongodb';

export interface WhatsAppIntegration {
  _id?: ObjectId;
  userId: string;
  isConnected: boolean;
  phoneNumber?: string;
  connectedAt?: Date;
  lastActivity?: Date;
  qrCode?: string;
  sessionData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  phoneNumber?: string;
  lastActivity?: Date;
  qrCode?: string;
}
