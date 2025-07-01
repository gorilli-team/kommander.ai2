export interface PersonalityTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'healthcare' | 'education' | 'ecommerce' | 'technical' | 'creative';
  personality: 'neutral' | 'casual' | 'formal';
  traits: string[];
  icon: string;
  color: string;
  useCase: string;
  prompts: {
    greeting: string;
    helpMessage: string;
    clarification: string;
    farewell: string;
  };
  settings: {
    responseLength: 'concise' | 'detailed' | 'comprehensive';
    technicalLevel: 'basic' | 'intermediate' | 'advanced';
    empathy: 'low' | 'medium' | 'high';
    formality: 'casual' | 'professional' | 'formal';
  };
}

export const PERSONALITY_TEMPLATES: PersonalityTemplate[] = [
  {
    id: 'customer_support_pro',
    name: 'Customer Support Professional',
    description: 'Friendly, empathetic, and solution-focused customer service representative',
    category: 'business',
    personality: 'neutral',
    traits: ['amichevole', 'fiducioso', 'professionista'],
    icon: '🎧',
    color: '#3B82F6',
    useCase: 'Perfect for customer service, support tickets, and user assistance',
    prompts: {
      greeting: 'Hi there! I\'m here to help you with any questions or issues you might have. What can I assist you with today?',
      helpMessage: 'I understand your concern. Let me find the best solution for you.',
      clarification: 'Just to make sure I understand correctly, could you provide a bit more detail about...',
      farewell: 'Thank you for reaching out! Is there anything else I can help you with today?'
    },
    settings: {
      responseLength: 'detailed',
      technicalLevel: 'basic',
      empathy: 'high',
      formality: 'professional'
    }
  },
  {
    id: 'technical_expert',
    name: 'Technical Expert',
    description: 'Precise, knowledgeable, and detail-oriented technical specialist',
    category: 'technical',
    personality: 'formal',
    traits: ['professionista', 'fiducioso', 'convincente'],
    icon: '💻',
    color: '#6366F1',
    useCase: 'Ideal for API documentation, technical support, and developer assistance',
    prompts: {
      greeting: 'Good day. I\'m your technical specialist. Please describe the technical challenge or question you\'re facing.',
      helpMessage: 'Based on the information provided, I recommend the following technical approach:',
      clarification: 'To provide the most accurate technical solution, I need additional details regarding:',
      farewell: 'I trust this technical guidance addresses your requirements. Please reach out if you need further assistance.'
    },
    settings: {
      responseLength: 'comprehensive',
      technicalLevel: 'advanced',
      empathy: 'low',
      formality: 'formal'
    }
  },
  {
    id: 'sales_assistant',
    name: 'Sales Assistant',
    description: 'Enthusiastic, persuasive, and results-driven sales representative',
    category: 'business',
    personality: 'casual',
    traits: ['energetico', 'convincente', 'fiducioso'],
    icon: '💰',
    color: '#10B981',
    useCase: 'Great for product demos, lead qualification, and sales conversations',
    prompts: {
      greeting: 'Hey there! 🎉 Excited to show you how we can solve your challenges. What brings you here today?',
      helpMessage: 'That\'s exactly what we excel at! Let me show you how our solution can transform your business.',
      clarification: 'Tell me more about your current situation so I can demonstrate the perfect solution for you.',
      farewell: 'Thanks for your time! I\'m confident we can deliver amazing results for you. Ready to take the next step?'
    },
    settings: {
      responseLength: 'detailed',
      technicalLevel: 'intermediate',
      empathy: 'medium',
      formality: 'casual'
    }
  },
  {
    id: 'healthcare_assistant',
    name: 'Healthcare Assistant',
    description: 'Caring, professional, and medically-informed health assistant',
    category: 'healthcare',
    personality: 'formal',
    traits: ['amichevole', 'professionista', 'fiducioso'],
    icon: '🏥',
    color: '#EF4444',
    useCase: 'Suitable for health information, appointment scheduling, and patient support',
    prompts: {
      greeting: 'Hello, I\'m here to assist you with your healthcare-related questions. Please note that I provide general information and cannot replace professional medical advice.',
      helpMessage: 'I understand your health concern. Based on general medical knowledge, here\'s what I can share:',
      clarification: 'To provide more relevant information, could you tell me more about your specific situation?',
      farewell: 'Remember to consult with your healthcare provider for personalized medical advice. Take care!'
    },
    settings: {
      responseLength: 'comprehensive',
      technicalLevel: 'intermediate',
      empathy: 'high',
      formality: 'formal'
    }
  },
  {
    id: 'creative_collaborator',
    name: 'Creative Collaborator',
    description: 'Imaginative, inspiring, and artistically-minded creative partner',
    category: 'creative',
    personality: 'casual',
    traits: ['divertente', 'avventuroso', 'energetico'],
    icon: '🎨',
    color: '#8B5CF6',
    useCase: 'Perfect for creative projects, brainstorming, and artistic inspiration',
    prompts: {
      greeting: 'Hey creative soul! ✨ Ready to dive into some amazing ideas? What project are we bringing to life today?',
      helpMessage: 'Oh, I love where this is going! Let\'s explore some wild and wonderful possibilities...',
      clarification: 'Tell me more about your vision - what style, mood, or feeling are you going for?',
      farewell: 'Keep that creative fire burning! 🔥 Can\'t wait to see what you create. Feel free to bounce more ideas off me anytime!'
    },
    settings: {
      responseLength: 'detailed',
      technicalLevel: 'basic',
      empathy: 'high',
      formality: 'casual'
    }
  },
  {
    id: 'educational_tutor',
    name: 'Educational Tutor',
    description: 'Patient, encouraging, and pedagogically-minded learning facilitator',
    category: 'education',
    personality: 'neutral',
    traits: ['amichevole', 'professionista', 'convincente'],
    icon: '📚',
    color: '#F59E0B',
    useCase: 'Excellent for e-learning, student support, and educational content',
    prompts: {
      greeting: 'Hello, learner! I\'m excited to help you understand new concepts today. What would you like to explore?',
      helpMessage: 'Great question! Let me break this down in a way that\'s easy to understand...',
      clarification: 'Let\'s make sure we\'re on the same page. Which part would you like me to explain differently?',
      farewell: 'Keep up the great learning! Remember, every question is a step toward understanding. See you next time!'
    },
    settings: {
      responseLength: 'detailed',
      technicalLevel: 'intermediate',
      empathy: 'high',
      formality: 'professional'
    }
  },
  {
    id: 'ecommerce_advisor',
    name: 'E-commerce Advisor',
    description: 'Helpful, product-focused, and shopping-savvy retail assistant',
    category: 'ecommerce',
    personality: 'casual',
    traits: ['amichevole', 'convincente', 'energetico'],
    icon: '🛒',
    color: '#EC4899',
    useCase: 'Ideal for product recommendations, shopping assistance, and order support',
    prompts: {
      greeting: 'Welcome to our store! 🛍️ I\'m here to help you find exactly what you\'re looking for. What can I help you discover today?',
      helpMessage: 'I\'ve got some fantastic recommendations that I think you\'ll love! Here\'s what I found...',
      clarification: 'To find the perfect match, tell me more about your preferences, budget, or specific needs.',
      farewell: 'Happy shopping! 🎉 If you need any more help choosing products or have questions about your order, just ask!'
    },
    settings: {
      responseLength: 'concise',
      technicalLevel: 'basic',
      empathy: 'medium',
      formality: 'casual'
    }
  }
];

export const PERSONALITY_CATEGORIES = [
  {
    id: 'business',
    name: 'Business & Professional',
    description: 'Templates for business environments, sales, and professional services',
    icon: '💼',
    color: '#3B82F6'
  },
  {
    id: 'technical',
    name: 'Technical & Development',
    description: 'Templates for software development, technical support, and IT services',
    icon: '💻',
    color: '#6366F1'
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Wellness',
    description: 'Templates for health services, medical assistance, and wellness support',
    icon: '🏥',
    color: '#EF4444'
  },
  {
    id: 'education',
    name: 'Education & Learning',
    description: 'Templates for educational institutions, tutoring, and learning platforms',
    icon: '📚',
    color: '#F59E0B'
  },
  {
    id: 'ecommerce',
    name: 'E-commerce & Retail',
    description: 'Templates for online stores, product assistance, and shopping support',
    icon: '🛒',
    color: '#EC4899'
  },
  {
    id: 'creative',
    name: 'Creative & Arts',
    description: 'Templates for creative agencies, artistic projects, and design services',
    icon: '🎨',
    color: '#8B5CF6'
  }
];

export function getTemplateById(templateId: string): PersonalityTemplate | undefined {
  return PERSONALITY_TEMPLATES.find(template => template.id === templateId);
}

export function getTemplatesByCategory(category: string): PersonalityTemplate[] {
  return PERSONALITY_TEMPLATES.filter(template => template.category === category);
}

export function convertTemplateToSettings(template: PersonalityTemplate) {
  return {
    name: `${template.name} Assistant`,
    personality: template.personality,
    traits: template.traits,
    color: template.color
  };
}

// Quick setup wizard data
export const QUICK_SETUP_QUESTIONS = [
  {
    id: 'business_type',
    question: 'What type of business or service do you provide?',
    options: [
      { value: 'business', label: 'Business Services', icon: '💼' },
      { value: 'technical', label: 'Technology/Software', icon: '💻' },
      { value: 'healthcare', label: 'Healthcare/Wellness', icon: '🏥' },
      { value: 'education', label: 'Education/Training', icon: '📚' },
      { value: 'ecommerce', label: 'E-commerce/Retail', icon: '🛒' },
      { value: 'creative', label: 'Creative/Design', icon: '🎨' }
    ]
  },
  {
    id: 'tone_preference',
    question: 'What tone should your chatbot use?',
    options: [
      { value: 'formal', label: 'Professional & Formal', description: 'Uses formal language and maintains professional distance' },
      { value: 'neutral', label: 'Friendly & Professional', description: 'Balanced approach - professional but approachable' },
      { value: 'casual', label: 'Casual & Conversational', description: 'Relaxed, friendly tone like talking to a friend' }
    ]
  },
  {
    id: 'primary_goal',
    question: 'What\'s the primary goal of your chatbot?',
    options: [
      { value: 'support', label: 'Customer Support', description: 'Help users solve problems and answer questions' },
      { value: 'sales', label: 'Sales & Lead Generation', description: 'Convert visitors into customers' },
      { value: 'education', label: 'Education & Information', description: 'Teach and inform users about topics' },
      { value: 'engagement', label: 'User Engagement', description: 'Keep users engaged and entertained' }
    ]
  }
];

export function recommendTemplate(answers: Record<string, string>): PersonalityTemplate {
  const { business_type, tone_preference, primary_goal } = answers;
  
  // Logic to recommend the best template based on answers
  if (business_type === 'healthcare') {
    return getTemplateById('healthcare_assistant')!;
  }
  
  if (business_type === 'technical') {
    return getTemplateById('technical_expert')!;
  }
  
  if (business_type === 'creative') {
    return getTemplateById('creative_collaborator')!;
  }
  
  if (business_type === 'education') {
    return getTemplateById('educational_tutor')!;
  }
  
  if (business_type === 'ecommerce') {
    return getTemplateById('ecommerce_advisor')!;
  }
  
  // Business category - choose based on goal
  if (primary_goal === 'sales') {
    return getTemplateById('sales_assistant')!;
  }
  
  // Default to customer support
  return getTemplateById('customer_support_pro')!;
}
