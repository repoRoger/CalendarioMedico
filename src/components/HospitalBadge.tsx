import React from 'react';
import { Hospital } from '../types';
import {
  Building2, Stethoscope, Heart, Activity, Shield, PlusSquare,
  Briefcase, Factory, Building, Star
} from 'lucide-react';

interface HospitalBadgeProps {
  hospital?: Hospital;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export const HospitalBadge: React.FC<HospitalBadgeProps> = ({
  hospital,
  size = 'sm',
  showName = true,
  className = '',
}) => {
  if (!hospital) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Building2 className="w-3.5 h-3.5" />
        {showName && <span>Sin centro</span>}
      </span>
    );
  }

  const renderIcon = () => {
    if (hospital.logoUrl) {
      return (
        <img
          src={hospital.logoUrl}
          alt={hospital.shortName}
          className="w-full h-full object-cover rounded-md"
          referrerPolicy="no-referrer"
        />
      );
    }

    const iconClasses = size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    switch (hospital.badgeIcon) {
      case 'cross':
        return <PlusSquare className={iconClasses} />;
      case 'stethoscope':
        return <Stethoscope className={iconClasses} />;
      case 'heart':
        return <Heart className={iconClasses} />;
      case 'activity':
        return <Activity className={iconClasses} />;
      case 'shield':
        return <Shield className={iconClasses} />;
      case 'briefcase':
        return <Briefcase className={iconClasses} />;
      case 'factory':
        return <Factory className={iconClasses} />;
      case 'building':
        return <Building className={iconClasses} />;
      case 'star':
        return <Star className={iconClasses} />;
      case 'hospital':
      default:
        return <Building2 className={iconClasses} />;
    }
  };

  const sizeStyles = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center justify-center shrink-0 rounded-xl text-white shadow-sm transition-transform hover:scale-105 font-bold ${sizeStyles[size]}`}
        style={{
          backgroundColor: hospital.color || hospital.gradientStart || '#0d9488',
        }}
        title={`${hospital.name} (${hospital.city})`}
      >
        {hospital.emoji ? <span className="leading-none">{hospital.emoji}</span> : renderIcon()}
      </div>
      {showName && (
        <span className="font-bold text-slate-200 truncate text-xs">
          {hospital.shortName}
        </span>
      )}
    </div>
  );
};
