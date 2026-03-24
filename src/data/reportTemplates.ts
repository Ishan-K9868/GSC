/**
 * Report Templates
 * PRD: 5.1.4 Template library for common scenarios
 * 
 * Pre-built report templates for flood relief, school meals, health camp, etc.
 */

import { NeedCategory } from '../types';
import type { NeedCategoryType, UrgencyLevelType } from '../types';

export interface ReportTemplate {
  id: string;
  name: string;
  nameHi: string;
  category: NeedCategoryType;
  subCategory?: string;
  description: string;
  descriptionHi: string;
  urgency: UrgencyLevelType;
  estimatedPeopleAffected: number;
  icon: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  // EMERGENCY TEMPLATES
  {
    id: 'flood_emergency',
    name: 'Flood Relief - Emergency',
    nameHi: 'बाढ़ राहत - आपातकाल',
    category: NeedCategory.EMERGENCY,
    subCategory: 'Natural disaster',
    description: 'Urgent flood relief required. Multiple families displaced, immediate shelter and food assistance needed.',
    descriptionHi: 'तत्काल बाढ़ राहत की आवश्यकता। कई परिवार विस्थापित, तत्काल आश्रय और भोजन सहायता की जरूरत।',
    urgency: 'critical',
    estimatedPeopleAffected: 50,
    icon: '🌊',
  },
  {
    id: 'medical_emergency',
    name: 'Medical Emergency',
    nameHi: 'चिकित्सा आपातकाल',
    category: NeedCategory.EMERGENCY,
    subCategory: 'Medical emergency',
    description: 'Critical medical emergency requiring immediate ambulance and hospital admission.',
    descriptionHi: 'गंभीर चिकित्सा आपातकाल जिसके लिए तत्काल एम्बुलेंस और अस्पताल में भर्ती की आवश्यकता है।',
    urgency: 'critical',
    estimatedPeopleAffected: 1,
    icon: '🚑',
  },

  // FOOD & NUTRITION TEMPLATES
  {
    id: 'midday_meal_disruption',
    name: 'Mid-Day Meal Disruption',
    nameHi: 'मध्याह्न भोजन व्यवधान',
    category: NeedCategory.FOOD_NUTRITION,
    subCategory: 'Mid-day meal disruption',
    description: 'School mid-day meal program disrupted. Children not receiving daily nutritious meals.',
    descriptionHi: 'स्कूल मध्याह्न भोजन कार्यक्रम बाधित। बच्चों को दैनिक पौष्टिक भोजन नहीं मिल रहा है।',
    urgency: 'high',
    estimatedPeopleAffected: 100,
    icon: '🍽️',
  },
  {
    id: 'acute_hunger',
    name: 'Acute Hunger - Community',
    nameHi: 'तीव्र भूख - समुदाय',
    category: NeedCategory.FOOD_NUTRITION,
    subCategory: 'Acute hunger',
    description: 'Community facing severe food shortage. Families going without meals for multiple days.',
    descriptionHi: 'समुदाय गंभीर खाद्य की कमी का सामना कर रहा है। परिवार कई दिनों से भोजन के बिना हैं।',
    urgency: 'high',
    estimatedPeopleAffected: 25,
    icon: '🍞',
  },

  // HEALTH TEMPLATES
  {
    id: 'health_camp',
    name: 'Health Camp Request',
    nameHi: 'स्वास्थ्य शिविर अनुरोध',
    category: NeedCategory.HEALTH,
    subCategory: 'Doctor visit',
    description: 'Request for mobile health camp. Community lacks access to basic healthcare services.',
    descriptionHi: 'मोबाइल स्वास्थ्य शिविर के लिए अनुरोध। समुदाय को बुनियादी स्वास्थ्य सेवाओं तक पहुंच नहीं है।',
    urgency: 'medium',
    estimatedPeopleAffected: 200,
    icon: '🏥',
  },
  {
    id: 'medicine_shortage',
    name: 'Medicine Shortage',
    nameHi: 'दवा की कमी',
    category: NeedCategory.HEALTH,
    subCategory: 'Medicines',
    description: 'Critical shortage of essential medicines. Chronic patients unable to access treatment.',
    descriptionHi: 'आवश्यक दवाओं की गंभीर कमी। पुराने रोगी उपचार तक पहुंचने में असमर्थ।',
    urgency: 'high',
    estimatedPeopleAffected: 15,
    icon: '💊',
  },
  {
    id: 'maternal_care',
    name: 'Maternal Healthcare',
    nameHi: 'मातृ स्वास्थ्य देखभाल',
    category: NeedCategory.HEALTH,
    subCategory: 'Maternal care',
    description: 'Pregnant women in area need access to antenatal care and safe delivery facilities.',
    descriptionHi: 'क्षेत्र में गर्भवती महिलाओं को प्रसवपूर्व देखभाल और सुरक्षित प्रसव सुविधाओं की आवश्यकता है।',
    urgency: 'high',
    estimatedPeopleAffected: 8,
    icon: '🤰',
  },

  // EDUCATION TEMPLATES
  {
    id: 'school_infrastructure',
    name: 'School Infrastructure Repair',
    nameHi: 'स्कूल बुनियादी ढांचा मरम्मत',
    category: NeedCategory.EDUCATION,
    subCategory: 'Infrastructure',
    description: 'School building in poor condition. Roof leaking, no proper classrooms, affecting student attendance.',
    descriptionHi: 'स्कूल भवन खराब स्थिति में। छत टपक रही है, उचित कक्षा कक्ष नहीं, छात्र उपस्थिति प्रभावित।',
    urgency: 'medium',
    estimatedPeopleAffected: 150,
    icon: '🏫',
  },
  {
    id: 'learning_materials',
    name: 'Learning Materials Needed',
    nameHi: 'शिक्षण सामग्री की आवश्यकता',
    category: NeedCategory.EDUCATION,
    subCategory: 'Learning material',
    description: 'Students lack basic learning materials - textbooks, notebooks, stationery.',
    descriptionHi: 'छात्रों के पास बुनियादी शिक्षण सामग्री की कमी है - पाठ्यपुस्तकें, नोटबुक, स्टेशनरी।',
    urgency: 'medium',
    estimatedPeopleAffected: 80,
    icon: '📚',
  },

  // WATER & SANITATION TEMPLATES
  {
    id: 'water_scarcity',
    name: 'Water Scarcity - Summer',
    nameHi: 'पानी की कमी - गर्मी',
    category: NeedCategory.WATER_SANITATION,
    subCategory: 'Drinking water scarcity',
    description: 'Severe drinking water shortage during summer. Community relying on contaminated sources.',
    descriptionHi: 'गर्मियों में पीने के पानी की गंभीर कमी। समुदाय दूषित स्रोतों पर निर्भर।',
    urgency: 'high',
    estimatedPeopleAffected: 500,
    icon: '💧',
  },
  {
    id: 'sanitation_crisis',
    name: 'Sanitation Crisis',
    nameHi: 'स्वच्छता संकट',
    category: NeedCategory.WATER_SANITATION,
    subCategory: 'Open defecation',
    description: 'No toilet facilities in area. Open defecation creating health and dignity issues.',
    descriptionHi: 'क्षेत्र में शौचालय सुविधाएं नहीं। खुले में शौच स्वास्थ्य और गरिमा के मुद्दे पैदा कर रहा है।',
    urgency: 'high',
    estimatedPeopleAffected: 200,
    icon: '🚽',
  },

  // SHELTER TEMPLATES
  {
    id: 'monsoon_shelter',
    name: 'Monsoon Shelter Damage',
    nameHi: 'मानसून आश्रय क्षति',
    category: NeedCategory.SHELTER,
    subCategory: 'Roof damage',
    description: 'Monsoon rains damaged multiple homes. Families need immediate shelter repair assistance.',
    descriptionHi: 'मानसून की बारिश ने कई घरों को क्षतिग्रस्त कर दिया। परिवारों को तत्काल आश्रय मरम्मत सहायता चाहिए।',
    urgency: 'high',
    estimatedPeopleAffected: 30,
    icon: '🏠',
  },
  {
    id: 'temporary_shelter',
    name: 'Temporary Shelter - Displaced',
    nameHi: 'अस्थायी आश्रय - विस्थापित',
    category: NeedCategory.SHELTER,
    subCategory: 'Temporary shelter',
    description: 'Displaced families need temporary shelter arrangement. Currently living in makeshift conditions.',
    descriptionHi: 'विस्थापित परिवारों को अस्थायी आश्रय व्यवस्था चाहिए। वर्तमान में अस्थायी स्थितियों में रह रहे हैं।',
    urgency: 'critical',
    estimatedPeopleAffected: 20,
    icon: '⛺',
  },

  // WOMEN & CHILD TEMPLATES
  {
    id: 'child_labor_risk',
    name: 'Child Labor Risk',
    nameHi: 'बाल श्रम जोखिम',
    category: NeedCategory.WOMEN_CHILD,
    subCategory: 'Child labour',
    description: 'Children identified working instead of attending school. Need intervention and family support.',
    descriptionHi: 'बच्चे स्कूल जाने के बजाय काम करते पाए गए। हस्तक्षेप और पारिवारिक सहायता की आवश्यकता।',
    urgency: 'high',
    estimatedPeopleAffected: 5,
    icon: '👶',
  },

  // ENVIRONMENT TEMPLATES
  {
    id: 'waste_management',
    name: 'Waste Management Crisis',
    nameHi: 'अपशिष्ट प्रबंधन संकट',
    category: NeedCategory.ENVIRONMENT,
    subCategory: 'Waste',
    description: 'Garbage accumulation in community area. No waste collection system, creating health hazard.',
    descriptionHi: 'सामुदायिक क्षेत्र में कचरा जमा। कोई अपशिष्ट संग्रह प्रणाली नहीं, स्वास्थ्य खतरा पैदा कर रहा है।',
    urgency: 'medium',
    estimatedPeopleAffected: 300,
    icon: '♻️',
  },
  {
    id: 'water_pollution',
    name: 'Water Body Contamination',
    nameHi: 'जल निकाय संदूषण',
    category: NeedCategory.ENVIRONMENT,
    subCategory: 'Water body contamination',
    description: 'Local water body severely polluted. Industrial waste affecting community water source and health.',
    descriptionHi: 'स्थानीय जल निकाय गंभीर रूप से प्रदूषित। औद्योगिक अपशिष्ट सामुदायिक जल स्रोत और स्वास्थ्य को प्रभावित कर रहा है।',
    urgency: 'high',
    estimatedPeopleAffected: 1000,
    icon: '🏭',
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: NeedCategoryType): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): NeedCategoryType[] {
  const categories = new Set(REPORT_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}
