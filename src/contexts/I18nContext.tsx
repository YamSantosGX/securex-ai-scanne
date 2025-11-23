import { createContext, useContext, ReactNode } from 'react';
import { useRegion } from './RegionContext';

type TranslationKey = string;

const translations = {
  pt: {
    // Navbar
    'nav.dashboard': 'Dashboard',
    'nav.pricing': 'Planos',
    'nav.discord': 'Nosso Servidor',
    'nav.login': 'Entrar',
    'nav.logout': 'Sair',
    'nav.start_free': 'Começar Grátis',
    
    // Home
    'home.hero.title': 'Proteção de Classe',
    'home.hero.title_highlight': 'Mundial',
    'home.hero.subtitle': 'Escaneie e proteja suas aplicações com inteligência artificial avançada',
    'home.cta.start': 'Começar Agora',
    'home.cta.plans': 'Ver Planos',
    'home.cta.discord': 'Junte-se ao Discord',
    
    // Pricing
    'pricing.title': 'Escolha seu',
    'pricing.title_highlight': 'Plano',
    'pricing.subtitle': 'Proteção profissional para aplicações de todos os tamanhos',
    'pricing.monthly': 'Mensal',
    'pricing.annual': 'Anual',
    'pricing.discount': '-10%',
    'pricing.per_month': '/mês',
    'pricing.per_year': '/ano',
    'pricing.payment_info': 'Pagamentos processados com segurança via',
    'pricing.faq_title': 'Perguntas',
    'pricing.faq_title_highlight': 'Frequentes',
    
    // Plans
    'plan.free.name': 'Free',
    'plan.free.description': 'Para começar',
    'plan.free.feature1': '3 scans por mês',
    'plan.free.feature2': 'Relatórios básicos',
    'plan.free.feature3': 'Suporte por email',
    'plan.free.feature4': 'Histórico de 30 dias',
    'plan.free.cta': 'Começar Grátis',
    
    'plan.pro.name': 'Pro',
    'plan.pro.description': 'Proteção completa com IA',
    'plan.pro.feature1': 'Scans ilimitados',
    'plan.pro.feature2': 'Relatórios avançados com IA',
    'plan.pro.feature3': 'Suporte prioritário 24/7',
    'plan.pro.feature4': 'Histórico ilimitado',
    'plan.pro.feature5': 'API de integração',
    'plan.pro.feature6': 'Alertas em tempo real',
    'plan.pro.feature7': 'Análise de código-fonte',
    'plan.pro.feature8': 'Proteção contra zero-day',
    'plan.pro.cta': 'Assinar Agora',
    'plan.pro.badge': 'Membro PRO',
    
    // FAQ
    'faq.q1': 'Como funciona o scan?',
    'faq.a1': 'Nosso sistema utiliza inteligência artificial avançada para analisar seu código e infraestrutura, identificando vulnerabilidades conhecidas e potenciais brechas de segurança.',
    'faq.q2': 'Posso cancelar a qualquer momento?',
    'faq.a2': 'Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas adicionais. Manterá acesso até o final do período pago.',
    'faq.q3': 'O scan afeta a performance do meu site?',
    'faq.a3': 'Não. Nossos scans são não-invasivos e executados de forma que não impacte a performance ou disponibilidade da sua aplicação.',
    'faq.q4': 'Quais linguagens e frameworks são suportados?',
    'faq.a4': 'Suportamos as principais linguagens (JavaScript, Python, PHP, Java, etc.) e frameworks (React, Vue, Laravel, Spring, etc.).',
    
    // Auth
    'auth.login': 'Entrar',
    'auth.signup': 'Criar Conta',
    'auth.email': 'Email',
    'auth.password': 'Senha',
    'auth.name': 'Nome',
    
    // Dashboard
    'dashboard.welcome': 'Bem-vindo',
    'dashboard.scan': 'Escanear',
    'dashboard.history': 'Histórico',
    
    // Common
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
  },
  en: {
    // Navbar
    'nav.dashboard': 'Dashboard',
    'nav.pricing': 'Pricing',
    'nav.discord': 'Our Server',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.start_free': 'Start Free',
    
    // Home
    'home.hero.title': 'World-Class',
    'home.hero.title_highlight': 'Protection',
    'home.hero.subtitle': 'Scan and protect your applications with advanced artificial intelligence',
    'home.cta.start': 'Get Started',
    'home.cta.plans': 'View Plans',
    'home.cta.discord': 'Join Discord',
    
    // Pricing
    'pricing.title': 'Choose your',
    'pricing.title_highlight': 'Plan',
    'pricing.subtitle': 'Professional protection for applications of all sizes',
    'pricing.monthly': 'Monthly',
    'pricing.annual': 'Annual',
    'pricing.discount': '-10%',
    'pricing.per_month': '/mo',
    'pricing.per_year': '/yr',
    'pricing.payment_info': 'Payments securely processed via',
    'pricing.faq_title': 'Frequently Asked',
    'pricing.faq_title_highlight': 'Questions',
    
    // Plans
    'plan.free.name': 'Free',
    'plan.free.description': 'Get started',
    'plan.free.feature1': '3 scans per month',
    'plan.free.feature2': 'Basic reports',
    'plan.free.feature3': 'Email support',
    'plan.free.feature4': '30-day history',
    'plan.free.cta': 'Start Free',
    
    'plan.pro.name': 'Pro',
    'plan.pro.description': 'Complete AI protection',
    'plan.pro.feature1': 'Unlimited scans',
    'plan.pro.feature2': 'Advanced AI reports',
    'plan.pro.feature3': '24/7 priority support',
    'plan.pro.feature4': 'Unlimited history',
    'plan.pro.feature5': 'Integration API',
    'plan.pro.feature6': 'Real-time alerts',
    'plan.pro.feature7': 'Source code analysis',
    'plan.pro.feature8': 'Zero-day protection',
    'plan.pro.cta': 'Subscribe Now',
    'plan.pro.badge': 'PRO Member',
    
    // FAQ
    'faq.q1': 'How does the scan work?',
    'faq.a1': 'Our system uses advanced artificial intelligence to analyze your code and infrastructure, identifying known vulnerabilities and potential security breaches.',
    'faq.q2': 'Can I cancel anytime?',
    'faq.a2': 'Yes! You can cancel your subscription at any time without additional fees. You will maintain access until the end of the paid period.',
    'faq.q3': 'Does scanning affect my website performance?',
    'faq.a3': 'No. Our scans are non-invasive and executed in a way that does not impact your application\'s performance or availability.',
    'faq.q4': 'Which languages and frameworks are supported?',
    'faq.a4': 'We support major languages (JavaScript, Python, PHP, Java, etc.) and frameworks (React, Vue, Laravel, Spring, etc.).',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.scan': 'Scan',
    'dashboard.history': 'History',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
  },
  de: {
    // Navbar
    'nav.dashboard': 'Dashboard',
    'nav.pricing': 'Preise',
    'nav.discord': 'Unser Server',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    'nav.start_free': 'Kostenlos starten',
    
    // Home
    'home.hero.title': 'Schutz der',
    'home.hero.title_highlight': 'Weltklasse',
    'home.hero.subtitle': 'Scannen und schützen Sie Ihre Anwendungen mit fortschrittlicher künstlicher Intelligenz',
    'home.cta.start': 'Jetzt starten',
    'home.cta.plans': 'Pläne ansehen',
    'home.cta.discord': 'Discord beitreten',
    
    // Pricing
    'pricing.title': 'Wählen Sie Ihren',
    'pricing.title_highlight': 'Plan',
    'pricing.subtitle': 'Professioneller Schutz für Anwendungen jeder Größe',
    'pricing.monthly': 'Monatlich',
    'pricing.annual': 'Jährlich',
    'pricing.discount': '-10%',
    'pricing.per_month': '/Monat',
    'pricing.per_year': '/Jahr',
    'pricing.payment_info': 'Zahlungen sicher verarbeitet über',
    'pricing.faq_title': 'Häufig gestellte',
    'pricing.faq_title_highlight': 'Fragen',
    
    // Plans
    'plan.free.name': 'Kostenlos',
    'plan.free.description': 'Erste Schritte',
    'plan.free.feature1': '3 Scans pro Monat',
    'plan.free.feature2': 'Grundlegende Berichte',
    'plan.free.feature3': 'E-Mail-Support',
    'plan.free.feature4': '30-Tage-Historie',
    'plan.free.cta': 'Kostenlos starten',
    
    'plan.pro.name': 'Pro',
    'plan.pro.description': 'Vollständiger KI-Schutz',
    'plan.pro.feature1': 'Unbegrenzte Scans',
    'plan.pro.feature2': 'Erweiterte KI-Berichte',
    'plan.pro.feature3': '24/7 Priority-Support',
    'plan.pro.feature4': 'Unbegrenzte Historie',
    'plan.pro.feature5': 'Integrations-API',
    'plan.pro.feature6': 'Echtzeit-Warnungen',
    'plan.pro.feature7': 'Quellcode-Analyse',
    'plan.pro.feature8': 'Zero-Day-Schutz',
    'plan.pro.cta': 'Jetzt abonnieren',
    'plan.pro.badge': 'PRO-Mitglied',
    
    // FAQ
    'faq.q1': 'Wie funktioniert der Scan?',
    'faq.a1': 'Unser System nutzt fortschrittliche künstliche Intelligenz, um Ihren Code und Ihre Infrastruktur zu analysieren und bekannte Schwachstellen sowie potenzielle Sicherheitslücken zu identifizieren.',
    'faq.q2': 'Kann ich jederzeit kündigen?',
    'faq.a2': 'Ja! Sie können Ihr Abonnement jederzeit ohne zusätzliche Gebühren kündigen. Sie behalten den Zugriff bis zum Ende des bezahlten Zeitraums.',
    'faq.q3': 'Beeinträchtigt das Scannen die Leistung meiner Website?',
    'faq.a3': 'Nein. Unsere Scans sind nicht-invasiv und werden so durchgeführt, dass sie die Leistung oder Verfügbarkeit Ihrer Anwendung nicht beeinträchtigen.',
    'faq.q4': 'Welche Sprachen und Frameworks werden unterstützt?',
    'faq.a4': 'Wir unterstützen die wichtigsten Sprachen (JavaScript, Python, PHP, Java usw.) und Frameworks (React, Vue, Laravel, Spring usw.).',
    
    // Auth
    'auth.login': 'Anmelden',
    'auth.signup': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.name': 'Name',
    
    // Dashboard
    'dashboard.welcome': 'Willkommen',
    'dashboard.scan': 'Scannen',
    'dashboard.history': 'Historie',
    
    // Common
    'common.loading': 'Lädt...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.cancel': 'Abbrechen',
    'common.confirm': 'Bestätigen',
  },
  fr: {
    // Navbar
    'nav.dashboard': 'Tableau de bord',
    'nav.pricing': 'Tarifs',
    'nav.discord': 'Notre serveur',
    'nav.login': 'Connexion',
    'nav.logout': 'Déconnexion',
    'nav.start_free': 'Commencer gratuitement',
    
    // Home
    'home.hero.title': 'Protection de',
    'home.hero.title_highlight': 'classe mondiale',
    'home.hero.subtitle': 'Scannez et protégez vos applications avec une intelligence artificielle avancée',
    'home.cta.start': 'Commencer maintenant',
    'home.cta.plans': 'Voir les plans',
    'home.cta.discord': 'Rejoindre Discord',
    
    // Pricing
    'pricing.title': 'Choisissez votre',
    'pricing.title_highlight': 'Plan',
    'pricing.subtitle': 'Protection professionnelle pour applications de toutes tailles',
    'pricing.monthly': 'Mensuel',
    'pricing.annual': 'Annuel',
    'pricing.discount': '-10%',
    'pricing.per_month': '/mois',
    'pricing.per_year': '/an',
    'pricing.payment_info': 'Paiements traités en toute sécurité via',
    'pricing.faq_title': 'Questions',
    'pricing.faq_title_highlight': 'fréquentes',
    
    // Plans
    'plan.free.name': 'Gratuit',
    'plan.free.description': 'Pour commencer',
    'plan.free.feature1': '3 scans par mois',
    'plan.free.feature2': 'Rapports de base',
    'plan.free.feature3': 'Support par email',
    'plan.free.feature4': 'Historique de 30 jours',
    'plan.free.cta': 'Commencer gratuitement',
    
    'plan.pro.name': 'Pro',
    'plan.pro.description': 'Protection IA complète',
    'plan.pro.feature1': 'Scans illimités',
    'plan.pro.feature2': 'Rapports IA avancés',
    'plan.pro.feature3': 'Support prioritaire 24/7',
    'plan.pro.feature4': 'Historique illimité',
    'plan.pro.feature5': 'API d\'intégration',
    'plan.pro.feature6': 'Alertes en temps réel',
    'plan.pro.feature7': 'Analyse du code source',
    'plan.pro.feature8': 'Protection zero-day',
    'plan.pro.cta': 'S\'abonner maintenant',
    'plan.pro.badge': 'Membre PRO',
    
    // FAQ
    'faq.q1': 'Comment fonctionne le scan ?',
    'faq.a1': 'Notre système utilise l\'intelligence artificielle avancée pour analyser votre code et votre infrastructure, en identifiant les vulnérabilités connues et les failles de sécurité potentielles.',
    'faq.q2': 'Puis-je annuler à tout moment ?',
    'faq.a2': 'Oui ! Vous pouvez annuler votre abonnement à tout moment sans frais supplémentaires. Vous conserverez l\'accès jusqu\'à la fin de la période payée.',
    'faq.q3': 'Le scan affecte-t-il les performances de mon site ?',
    'faq.a3': 'Non. Nos scans sont non invasifs et exécutés de manière à ne pas impacter les performances ou la disponibilité de votre application.',
    'faq.q4': 'Quels langages et frameworks sont supportés ?',
    'faq.a4': 'Nous supportons les principaux langages (JavaScript, Python, PHP, Java, etc.) et frameworks (React, Vue, Laravel, Spring, etc.).',
    
    // Auth
    'auth.login': 'Connexion',
    'auth.signup': 'S\'inscrire',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.name': 'Nom',
    
    // Dashboard
    'dashboard.welcome': 'Bienvenue',
    'dashboard.scan': 'Scanner',
    'dashboard.history': 'Historique',
    
    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
  },
};

type I18nContextType = {
  t: (key: TranslationKey) => string;
  language: string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { regionConfig } = useRegion();
  
  const t = (key: TranslationKey): string => {
    const lang = regionConfig.language as keyof typeof translations;
    return translations[lang]?.[key] || translations.pt[key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, language: regionConfig.language }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};