import { Campus, University } from '../types';

export const MASTER_CAMPUSES: Campus[] = [
  // ==================== UNIOSUN (6 Campuses) ====================
  {
    id: 'uniosun_osogbo',
    universityId: 'uniosun',
    name: 'UNIOSUN Osogbo Main Campus',
    shortName: 'Osogbo Campus',
    city: 'Osogbo',
    state: 'Osun State',
    lat: 7.7850,
    lng: 4.5800,
    description: 'Main Administrative & Science Campus at Oke-Baale, Osogbo',
    isMainCampus: true
  },
  {
    id: 'uniosun_ikire',
    universityId: 'uniosun',
    name: 'UNIOSUN Ikire Campus',
    shortName: 'Ikire Campus',
    city: 'Ikire',
    state: 'Osun State',
    lat: 7.3620,
    lng: 4.1850,
    description: 'College of Humanities and Culture located in Ikire town'
  },
  {
    id: 'uniosun_okuku',
    universityId: 'uniosun',
    name: 'UNIOSUN Okuku Campus',
    shortName: 'Okuku Campus',
    city: 'Okuku',
    state: 'Osun State',
    lat: 7.9730,
    lng: 4.6710,
    description: 'College of Management and Social Sciences in Okuku'
  },
  {
    id: 'uniosun_ejigbo',
    universityId: 'uniosun',
    name: 'UNIOSUN Ejigbo Campus',
    shortName: 'Ejigbo Campus',
    city: 'Ejigbo',
    state: 'Osun State',
    lat: 7.8930,
    lng: 4.3120,
    description: 'College of Agriculture in Ejigbo town'
  },
  {
    id: 'uniosun_ifetedo',
    universityId: 'uniosun',
    name: 'UNIOSUN Ifetedo Campus',
    shortName: 'Ifetedo Campus',
    city: 'Ifetedo',
    state: 'Osun State',
    lat: 7.1850,
    lng: 4.6850,
    description: 'College of Law in Ifetedo town'
  },
  {
    id: 'uniosun_ipetu',
    universityId: 'uniosun',
    name: 'UNIOSUN Ipetu-Ijesa Campus',
    shortName: 'Ipetu-Ijesa Campus',
    city: 'Ipetu-Ijesa',
    state: 'Osun State',
    lat: 7.4620,
    lng: 4.8820,
    description: 'College of Education in Ipetu-Ijesa'
  },

  // ==================== UNILAG ====================
  {
    id: 'unilag_akoka',
    universityId: 'unilag',
    name: 'UNILAG Akoka Main Campus',
    shortName: 'Akoka Campus',
    city: 'Akoka, Yaba',
    state: 'Lagos State',
    lat: 6.5158,
    lng: 3.3898,
    description: 'Main Academic and Administrative Campus in Akoka',
    isMainCampus: true
  },
  {
    id: 'unilag_idi_araba',
    universityId: 'unilag',
    name: 'UNILAG College of Medicine (Idi-Araba)',
    shortName: 'Idi-Araba Campus',
    city: 'Idi-Araba',
    state: 'Lagos State',
    lat: 6.5220,
    lng: 3.3560,
    description: 'Medical Sciences & LUTH Medical Complex'
  },

  // ==================== UNIVERSITY OF IBADAN (UI) ====================
  {
    id: 'ui_main',
    universityId: 'ui',
    name: 'UI Main Campus (Agbowo)',
    shortName: 'Main Campus',
    city: 'Ibadan',
    state: 'Oyo State',
    lat: 7.4443,
    lng: 3.8997,
    description: 'Main Campus along Agbowo / Bodija Axis',
    isMainCampus: true
  },
  {
    id: 'ui_uch',
    universityId: 'ui',
    name: 'UI College of Medicine / UCH',
    shortName: 'UCH Campus',
    city: 'Ibadan',
    state: 'Oyo State',
    lat: 7.4012,
    lng: 3.9012,
    description: 'University College Hospital & Medical School'
  },

  // ==================== OBAFEMI AWOLOWO UNIVERSITY (OAU) ====================
  {
    id: 'oau_main',
    universityId: 'oau',
    name: 'OAU Great Ife Main Campus',
    shortName: 'Main Campus',
    city: 'Ile-Ife',
    state: 'Osun State',
    lat: 7.5177,
    lng: 4.5273,
    description: 'Main Campus along Road 1 & Mayfair Gate',
    isMainCampus: true
  },

  // ==================== FUOYE ====================
  {
    id: 'fuoye_oye',
    universityId: 'fuoye',
    name: 'FUOYE Oye Main Campus',
    shortName: 'Oye Campus',
    city: 'Oye-Ekiti',
    state: 'Ekiti State',
    lat: 7.7981,
    lng: 5.3321,
    description: 'Main Academic Campus in Oye-Ekiti',
    isMainCampus: true
  },
  {
    id: 'fuoye_ikole',
    universityId: 'fuoye',
    name: 'FUOYE Ikole Campus',
    shortName: 'Ikole Campus',
    city: 'Ikole-Ekiti',
    state: 'Ekiti State',
    lat: 7.7912,
    lng: 5.5123,
    description: 'Engineering & Agriculture Campus in Ikole'
  },

  // ==================== UNIBEN ====================
  {
    id: 'uniben_ugbowo',
    universityId: 'uniben',
    name: 'UNIBEN Ugbowo Main Campus',
    shortName: 'Ugbowo Campus',
    city: 'Benin City',
    state: 'Edo State',
    lat: 6.4011,
    lng: 5.6148,
    description: 'Main Campus at Ugbowo',
    isMainCampus: true
  },
  {
    id: 'uniben_ekewan',
    universityId: 'uniben',
    name: 'UNIBEN Ekehuan Campus',
    shortName: 'Ekehuan Campus',
    city: 'Benin City',
    state: 'Edo State',
    lat: 6.3312,
    lng: 5.6012,
    description: 'Arts & Creative Studies Campus'
  },

  // ==================== FEDERAL POLY EDE ====================
  {
    id: 'fedpolyede_north',
    universityId: 'fedpolyede',
    name: 'Fed Poly Ede North Campus',
    shortName: 'North Campus',
    city: 'Ede',
    state: 'Osun State',
    lat: 7.7211,
    lng: 4.4421,
    description: 'North Campus along Ede-Osogbo Road',
    isMainCampus: true
  },
  {
    id: 'fedpolyede_south',
    universityId: 'fedpolyede',
    name: 'Fed Poly Ede South Campus',
    shortName: 'South Campus',
    city: 'Ede',
    state: 'Osun State',
    lat: 7.7311,
    lng: 4.4521,
    description: 'South Campus Area'
  }
];

export function getCampusesByUniversityId(
  universityId: string,
  universitiesList?: University[]
): Campus[] {
  if (!universityId) return [];
  const cleanId = universityId.toLowerCase().trim();
  const matched = MASTER_CAMPUSES.filter(c => c.universityId.toLowerCase() === cleanId);
  
  if (matched.length > 0) {
    return matched;
  }

  // Fallback for single-campus or uncatalogued universities
  const uni = universitiesList?.find(u => u.id.toLowerCase() === cleanId);
  if (uni) {
    return [{
      id: `${uni.id}_main`,
      universityId: uni.id,
      name: `${uni.code || uni.name} Main Campus`,
      shortName: 'Main Campus',
      city: uni.city,
      state: uni.state,
      lat: uni.lat,
      lng: uni.lng,
      isMainCampus: true,
      description: uni.description
    }];
  }

  return [];
}

export function getCampusById(
  campusId?: string,
  universityId?: string,
  universitiesList?: University[]
): Campus | undefined {
  if (campusId) {
    const found = MASTER_CAMPUSES.find(c => c.id === campusId);
    if (found) return found;
  }

  if (universityId) {
    const campuses = getCampusesByUniversityId(universityId, universitiesList);
    return campuses.find(c => c.isMainCampus) || campuses[0];
  }

  return undefined;
}

export function getDefaultCampusForUniversity(
  universityId: string,
  universitiesList?: University[]
): Campus {
  const campuses = getCampusesByUniversityId(universityId, universitiesList);
  return campuses.find(c => c.isMainCampus) || campuses[0] || {
    id: `${universityId}_default`,
    universityId: universityId,
    name: 'Main Campus',
    shortName: 'Main Campus',
    city: 'Campus City',
    state: 'State',
    lat: 7.5000,
    lng: 4.5000,
    isMainCampus: true
  };
}
