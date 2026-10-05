import React, { useState } from 'react';
import {
  Building2, Plus, Edit2, Trash2, MapPin, Briefcase, Calendar,
  Sparkles, Check, AlertCircle, ShieldAlert, Stethoscope, Heart, Activity,
  Shield, Factory, Building, Star
} from 'lucide-react';
import { Hospital, MedicalShift } from '../types';

interface WorkplacesListViewProps {
  hospitals: Hospital[];
  shifts: MedicalShift[];
  onOpenCreate: () => void;
  onOpenEdit: (hospital: Hospital) => void;
  onDeleteHospital: (hospitalId: string) => void;
  onLoadDefaultHospitals?: () => void;
}

const getBadgeIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'stethoscope': return Stethoscope;
    case 'heart': return Heart;
    case 'activity': return Activity;
    case 'shield': return Shield;
    case 'factory': return Factory;
    case 'building': return Building;
    case 'briefcase': return Briefcase;
    case 'star': return Star;
    case 'hospital':
    default:
      return Building2;
  }
};

export const WorkplacesListView: React.FC<WorkplacesListViewProps> = ({
  hospitals,
  shifts,
  onOpenCreate,
  onOpenEdit,
  onDeleteHospital,
  onLoadDefaultHospitals,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Shifts count per hospital
  const shiftsPerHospital: Record<string, number> = {};
  shifts.forEach((s) => {
    if (s.shiftCode !== 'L') {
      shiftsPerHospital[s.hospitalId] = (shiftsPerHospital[s.hospitalId] || 0) + 1;
    }
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Lugares de Trabajo
            </h1>
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
              {hospitals.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Listado de hospitales, clínicas, empresas o maquilas donde programas tus turnos.
          </p>
        </div>

        {/* Action Button: Opens the Popup */}
        <button
          onClick={onOpenCreate}
          className="self-start sm:self-center px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Lugar de Trabajo</span>
        </button>
      </div>

      {/* Workplaces List (Listado visual sin ser popup) */}
      {hospitals.length === 0 ? (
        <div className="py-12 px-4 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">Aún no tienes lugares registrados</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Agrega tu primer hospital o centro médico para poder asignar tus turnos en el calendario.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={onOpenCreate}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/30 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear mi primer lugar</span>
            </button>
            {onLoadDefaultHospitals && (
              <button
                onClick={onLoadDefaultHospitals}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Cargar sugeridos (Bendaña, Catarino, CEMESA)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {hospitals.map((hosp) => {
            const IconComp = getBadgeIconComponent(hosp.badgeIcon);
            const totalShifts = shiftsPerHospital[hosp.id] || 0;
            const isConfirmingDelete = deleteConfirmId === hosp.id;

            return (
              <div
                key={hosp.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-lg hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Icon, Name & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md text-xl font-bold"
                    style={{
                      backgroundColor: hosp.color || hosp.gradientStart || '#0d9488',
                    }}
                  >
                    {hosp.emoji ? (
                      <span>{hosp.emoji}</span>
                    ) : (
                      <IconComp className="w-6 h-6" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                        {hosp.name}
                      </h3>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-teal-300 border border-slate-700 shrink-0">
                        {hosp.shortName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        <span>{hosp.businessType || 'Hospital / Clínica'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{hosp.city || 'Honduras'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-teal-400/90 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{totalShifts} turnos registrados</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40">
                      <span className="text-xs text-rose-300 font-semibold px-1">¿Eliminar?</span>
                      <button
                        onClick={() => {
                          onDeleteHospital(hosp.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Button to open edit popup */}
                      <button
                        onClick={() => onOpenEdit(hosp)}
                        className="min-h-[40px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                        title={`Editar ${hosp.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Editar</span>
                      </button>

                      {/* Button to confirm delete */}
                      <button
                        onClick={() => setDeleteConfirmId(hosp.id)}
                        className="min-h-[40px] px-3 py-2 bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-800 hover:border-rose-500/40 transition-all"
                        title="Eliminar lugar de trabajo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
