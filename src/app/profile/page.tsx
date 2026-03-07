"use client";

import React, { useState } from 'react';
import { 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Settings, 
  Trash2, 
  Share2,
  ExternalLink,
  MessageCircle
} from 'lucide-react';

// --- Types ---
type BlockType = 'address' | 'team' | 'gallery' | 'content' | 'ecommerce' | 'contact' | 'banner' | 'video';

interface ProfileBlock {
  id: string;
  type: BlockType;
  data: any;
}

export default function ProfileBuilderPage() {
  const [isEditMode, setIsEditMode] = useState(true);
  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  
  // --- Actions ---
  const addBlock = (type: BlockType) => {
    const newBlock: ProfileBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: {}
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 1. FIXED HEADER */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          <button className="absolute bottom-4 right-4 bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/40 transition">
            <Camera className="text-white w-5 h-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative -mt-16 mb-4 flex flex-col items-center md:items-start md:flex-row md:space-x-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                <img src="/api/placeholder/128/128" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full shadow-lg hover:bg-blue-700 transition">
                <Camera className="text-white w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4 md:mt-20 flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900">השם שלך כאן</h1>
              <p className="text-lg text-gray-600 font-medium">כותרת מקצועית / טיטל</p>
              <p className="text-gray-500 max-w-lg mt-2 italic">קצת עליי בקצרה... כאן תוכלו לכתוב תיאור קצר שיספר לכולם מי אתם ומה אתם עושים.</p>
            </div>
          </div>

          {/* Contact Icons */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
            <button className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition">
              <MessageCircle className="w-4 h-4 ml-2" />
              <span>WhatsApp</span>
            </button>
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition">
              <Phone className="w-4 h-4 ml-2" />
              <span>Call</span>
            </button>
            <button className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-full hover:bg-gray-900 transition">
              <Mail className="w-4 h-4 ml-2" />
              <span>Email</span>
            </button>
          </div>
        </div>
      </div>

      <hr className="max-w-4xl mx-auto border-gray-200 mb-8" />

      {/* 2. DYNAMIC BLOCKS AREA */}
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {blocks.map((block) => (
          <div key={block.id} className="relative group bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            {isEditMode && (
              <div className="absolute -top-3 -right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-white border shadow-md p-2 rounded-full hover:text-blue-600 transition">
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => removeBlock(block.id)}
                  className="bg-white border shadow-md p-2 rounded-full hover:text-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Block Content Placeholders */}
            <div className="py-4 text-center">
              <div className="inline-block p-3 bg-blue-50 text-blue-600 rounded-full mb-2">
                {block.type === 'address' && <MapPin />}
                {block.type === 'ecommerce' && <Plus />}
                {/* Add other icons based on type */}
              </div>
              <h3 className="font-bold text-gray-800 uppercase tracking-wide">
                {block.type} Block
              </h3>
              <p className="text-gray-400 text-sm italic">Block content will appear here after configuration</p>
            </div>
          </div>
        ))}

        {/* 3. BLOCK PICKER (ADD BUTTON) */}
        {isEditMode && (
          <div className="mt-12 text-center">
            <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">הוספת בלוק חדש</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'address', label: 'כתובת', icon: <MapPin /> },
                { type: 'team', label: 'צוות', icon: <Plus /> },
                { type: 'gallery', label: 'גלריה', icon: <Plus /> },
                { type: 'ecommerce', label: 'חנות', icon: <Plus /> },
                { type: 'video', label: 'וידאו', icon: <Plus /> },
                { type: 'content', label: 'תוכן', icon: <Plus /> },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => addBlock(item.type as BlockType)}
                  className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="text-gray-400 group-hover:text-blue-500 mb-2">{item.icon}</div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-blue-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-lg border shadow-2xl rounded-full px-6 py-3 flex items-center space-x-6">
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={`font-bold transition-colors ${isEditMode ? 'text-blue-600' : 'text-gray-600'}`}
        >
          {isEditMode ? 'סיום עריכה' : 'עריכת פרופיל'}
        </button>
        <div className="w-px h-6 bg-gray-200"></div>
        <button className="text-gray-600 hover:text-blue-600 transition">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}