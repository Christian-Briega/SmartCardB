import { MaterialIcons } from '@expo/vector-icons';
import { CardType } from '../types';

type PassIconName = keyof typeof MaterialIcons.glyphMap;

export interface PassTypeOption {
  label: string;
  title: string;
  tag: string;
  description: string;
  icon: PassIconName;
  colors: [string, string, ...string[]];
}

export const PASS_TYPE_OPTIONS: Record<CardType, PassTypeOption> = {
  comum: {
    label: 'Comum',
    title: 'SmartCard BUS Comum',
    tag: 'Metropolitano • SP',
    description: 'Passe para uso geral no transporte público.',
    icon: 'directions-bus',
    colors: ['#003ec8', '#0d53fc', '#002b8f'],
  },
  estudante: {
    label: 'Escolar',
    title: 'Passe Escolar',
    tag: 'Benefício Escolar',
    description: 'Passe estudantil escolar, sujeito à validação de comprovante.',
    icon: 'school',
    colors: ['#24124d', '#43238a', '#2563eb'],
  },
  universitario: {
    label: 'Universitário',
    title: 'Passe Universitário',
    tag: 'Benefício Universitário',
    description: 'Passe estudantil universitário, sujeito à validação de comprovante.',
    icon: 'school',
    colors: ['#43238a', '#6d4bb3', '#2563eb'],
  },
  vt: {
    label: 'Vale-transporte',
    title: 'Vale-Transporte',
    tag: 'Convênio Corporativo',
    description: 'Benefício de transporte vinculado ao empregador.',
    icon: 'domain',
    colors: ['#1e293b', '#334155', '#0f172a'],
  },
  pcd: {
    label: 'PCD gratuito',
    title: 'Passe PCD Gratuito',
    tag: 'Gratuidade PCD',
    description: 'Passe gratuito destinado a pessoas com deficiência.',
    icon: 'accessible',
    colors: ['#075e54', '#14806f', '#064e3b'],
  },
  idoso: {
    label: 'Idoso gratuito',
    title: 'Passe Idoso Gratuito',
    tag: 'Gratuidade Idoso',
    description: 'Passe gratuito destinado a pessoas idosas.',
    icon: 'elderly',
    colors: ['#365c7d', '#527b9f', '#25445f'],
  },
  especial: {
    label: 'Especial',
    title: 'Passe Especial',
    tag: 'Entidades beneficentes',
    description: 'Destinado a entidades beneficentes.',
    icon: 'volunteer-activism',
    colors: ['#7c3f00', '#a65b12', '#613000'],
  },
};

export const PASS_TYPES = Object.keys(PASS_TYPE_OPTIONS) as CardType[];

export const isStudentPass = (type: CardType): boolean =>
  type === 'estudante' || type === 'universitario';
