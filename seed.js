import pg from 'pg';
import dotenv from 'dotenv';

const env = dotenv.config().parsed;

const pool = new pg.Pool({
  host: env.DBHOST,
  port: parseInt(env.DBPORT),
  database: env.DBNAME,
  user: env.USER,
  password: env.PASSWORD,
});

async function insertRows(client, table, columns, rows, returning = null) {
  if (!rows.length) return [];
  const values = [];
  const groups = rows.map((row) => {
    const placeholders = row.map((val) => {
      values.push(val);
      return `$${values.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${groups.join(', ')}`;
  if (returning) sql += ` RETURNING ${returning}`;
  const result = await client.query(sql, values);
  return result.rows;
}

async function seed() {
  const password = 'password123';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE
        "User", SystemAdmin, ReliefOrganization, Volunteer, PublicUser,
        Area, DisasterEvent, DisasterEventArea, Shelter, VolunteerShelterAssignment,
        Victim, Resource, Inventory, ResourceRequest, ResourceRequestItem,
        Task, EmergencyReport, EmergencyAnnouncement
      CASCADE
    `);

    // ---- Users (15) ----
    const users = await insertRows(client, '"User"',
      ['username', 'password', 'role'],
      [
        ['admin1', password, 'ADMIN'],
        ['admin2', password, 'ADMIN'],
        ['redcrescent', password, 'RELIEF_ORG'],
        ['mercyrelief', password, 'RELIEF_ORG'],
        ['ahmad', password, 'VOLUNTEER'],
        ['siti', password, 'VOLUNTEER'],
        ['raj', password, 'VOLUNTEER'],
        ['meiling', password, 'VOLUNTEER'],
        ['farid', password, 'VOLUNTEER'],
        ['nurul', password, 'VOLUNTEER'],
        ['vikram', password, 'VOLUNTEER'],
        ['weijie', password, 'VOLUNTEER'],
        ['ali', password, 'PUBLIC'],
        ['sarah', password, 'PUBLIC'],
        ['kumar', password, 'PUBLIC'],
      ],
      'user_id'
    );

    const [admin1, admin2] = users.slice(0, 2).map(r => r.user_id);
    const [org1, org2] = users.slice(2, 4).map(r => r.user_id);
    const vol = users.slice(4, 12).map(r => r.user_id);
    const pub = users.slice(12, 15).map(r => r.user_id);

    // ---- SystemAdmin (2) ----
    await insertRows(client, 'SystemAdmin',
      ['admin_id', 'name', 'contact_number'],
      [
        [admin1, 'Encik Razali bin Mohd', '0123456789'],
        [admin2, 'Puan Noraini binti Ismail', '0129876543'],
      ]
    );

    // ---- ReliefOrganization (2) ----
    await insertRows(client, 'ReliefOrganization',
      ['org_id', 'name', 'address', 'contact_number', 'status', 'approved_by'],
      [
        [org1, 'Malaysian Red Crescent Society', '32 Jalan Nipah, Off Jalan Ampang, 55000 Kuala Lumpur', '0321438122', 'APPROVED', admin1],
        [org2, 'Mercy Relief Malaysia', '15 Jalan Sultan Ismail, 50250 Kuala Lumpur', '0321615588', 'PENDING', null],
      ]
    );

    // ---- Volunteer (8) ----
    await insertRows(client, 'Volunteer',
      ['volunteer_id', 'name', 'age', 'gender', 'contact_number', 'organization_id', 'status'],
      [
        [vol[0], 'Ahmad bin Hassan', 28, 'MALE', '0125550001', org1, 'ACTIVE'],
        [vol[1], 'Siti Aminah binti Yusof', 25, 'FEMALE', '0125550002', org1, 'ACTIVE'],
        [vol[2], 'Raj Kumar a/l Suresh', 32, 'MALE', '0125550003', org1, 'ACTIVE'],
        [vol[3], 'Tan Mei Ling', 27, 'FEMALE', '0125550004', org1, 'ACTIVE'],
        [vol[4], 'Farid bin Abdullah', 30, 'MALE', '0125550005', org1, 'ACTIVE'],
        [vol[5], 'Nurul Izzah binti Omar', 24, 'FEMALE', '0125550006', org1, 'ACTIVE'],
        [vol[6], 'Vikram a/l Rajan', 35, 'MALE', '0125550007', org1, 'ACTIVE'],
        [vol[7], 'Lee Wei Jie', 29, 'MALE', '0125550008', org1, 'INACTIVE'],
      ]
    );

    // ---- PublicUser (3) ----
    await insertRows(client, 'PublicUser',
      ['user_id', 'name', 'age', 'gender', 'contact_number'],
      [
        [pub[0], 'Ali bin Abu', 40, 'MALE', '0131112222'],
        [pub[1], 'Sarah binti Kamal', 33, 'FEMALE', '0133334444'],
        [pub[2], 'Kumar a/l Raman', 45, 'MALE', '0135556666'],
      ]
    );

    // ---- Area (32) ----
    const areas = await insertRows(client, 'Area',
      ['name', 'state'],
      [
        ['Petaling Jaya', 'Selangor'],
        ['Shah Alam', 'Selangor'],
        ['Subang Jaya', 'Selangor'],
        ['Klang', 'Selangor'],
        ['Ampang', 'Selangor'],
        ['Kajang', 'Selangor'],
        ['Bangi', 'Selangor'],
        ['Cyberjaya', 'Selangor'],
        ['Rawang', 'Selangor'],
        ['Selayang', 'Selangor'],
        ['Gombak', 'Selangor'],
        ['Hulu Langat', 'Selangor'],
        ['Kuala Selangor', 'Selangor'],
        ['Sepang', 'Selangor'],
        ['Semenyih', 'Selangor'],
        ['Puchong', 'Selangor'],
        ['Serdang', 'Selangor'],
        ['Damansara', 'Selangor'],
        ['Sungai Buloh', 'Selangor'],
        ['Banting', 'Selangor'],
        ['Kuala Langat', 'Selangor'],
        ['Sabak Bernam', 'Selangor'],
        ['Kuala Lumpur City Centre', 'Kuala Lumpur'],
        ['Cheras', 'Kuala Lumpur'],
        ['Kepong', 'Kuala Lumpur'],
        ['Setapak', 'Kuala Lumpur'],
        ['Wangsa Maju', 'Kuala Lumpur'],
        ['Bukit Bintang', 'Kuala Lumpur'],
        ['Sentul', 'Kuala Lumpur'],
        ['Titiwangsa', 'Kuala Lumpur'],
        ['Segambut', 'Kuala Lumpur'],
        ['Lembah Pantai', 'Kuala Lumpur'],
      ],
      'area_id'
    );
    const area = areas.map(r => r.area_id);
    // Indices: 0=PJ, 1=Shah Alam, 2=Subang, 3=Klang, 4=Ampang, 5=Kajang, 6=Bangi,
    // 7=Cyberjaya, 8=Rawang, 9=Selayang, 10=Gombak, 11=Hulu Langat, 12=Kuala Selangor,
    // 13=Sepang, 14=Semenyih, 15=Puchong, 16=Serdang, 17=Damansara, 18=Sungai Buloh,
    // 19=Banting, 20=Kuala Langat, 21=Sabak Bernam, 22=KL CC, 23=Cheras, 24=Kepong,
    // 25=Setapak, 26=Wangsa Maju, 27=Bukit Bintang, 28=Sentul, 29=Titiwangsa,
    // 30=Segambut, 31=Lembah Pantai

    // ---- DisasterEvent (5) ----
    const events = await insertRows(client, 'DisasterEvent',
      ['name', 'description', 'type', 'severity', 'start_date', 'end_date', 'status', 'created_by'],
      [
        ['Klang Valley Flood 2026',
          'Severe flooding affecting multiple areas in the Klang Valley due to prolonged monsoon rainfall and river overflow.',
          'FLOOD', 'CRITICAL', '2026-07-20', null, 'ACTIVE', admin1],
        ['Hulu Langat Landslide 2026',
          'Multiple landslides triggered by heavy rainfall in the Hulu Langat district affecting residential and commercial areas.',
          'LANDSLIDE', 'HIGH', '2026-08-01', null, 'ACTIVE', admin1],
        ['KL Severe Storm 2026',
          'Severe thunderstorm causing flash floods and structural damage across several Kuala Lumpur districts.',
          'SEVERE_STORM', 'MEDIUM', '2026-08-05', null, 'ACTIVE', admin2],
        ['Shah Alam Flood 2025',
          'Major flooding in Shah Alam caused by monsoon season overflow affecting low-lying residential areas.',
          'FLOOD', 'HIGH', '2025-12-15', '2026-01-10', 'RESOLVED', admin1],
        ['Klang Flood 2025',
          'Moderate flooding in Klang district during late monsoon season impacting riverside communities.',
          'FLOOD', 'MEDIUM', '2025-11-20', '2025-12-05', 'RESOLVED', admin2],
      ],
      'event_id'
    );
    const evt = events.map(r => r.event_id);

    // ---- DisasterEventArea (14) ----
    await insertRows(client, 'DisasterEventArea',
      ['event_id', 'area_id'],
      [
        [evt[0], area[3]], [evt[0], area[1]], [evt[0], area[0]], [evt[0], area[2]], [evt[0], area[15]],
        [evt[1], area[11]], [evt[1], area[4]], [evt[1], area[14]],
        [evt[2], area[23]], [evt[2], area[24]], [evt[2], area[25]], [evt[2], area[26]],
        [evt[3], area[1]],
        [evt[4], area[3]],
      ]
    );

    // ---- Shelter (12) ----
    const shelters = await insertRows(client, 'Shelter',
      ['name', 'address', 'contact_number', 'capacity', 'current_occupancy', 'status', 'area_id', 'created_by'],
      [
        ['Dewan Komuniti Klang', 'Jalan Meru, 41050 Klang, Selangor', '0333711000', 250, 243, 'OPEN', area[3], admin1],
        ['SK Shah Alam', 'Persiaran Kayangan, 40000 Shah Alam, Selangor', '0355102345', 200, 134, 'OPEN', area[1], admin1],
        ['Dewan Serbaguna PJ', 'Jalan Universiti, 46200 Petaling Jaya, Selangor', '0379566789', 180, 195, 'OPEN', area[0], admin1],
        ['Balai Raya Subang Jaya', 'Jalan SS15/4, 47500 Subang Jaya, Selangor', '0356361234', 150, 112, 'OPEN', area[2], admin1],
        ['Dewan MBPJ Puchong', 'Jalan Puchong Perdana, 47100 Puchong, Selangor', '0380605678', 160, 76, 'OPEN', area[15], admin1],
        ['SK Hulu Langat', 'Jalan Hulu Langat, 43100 Hulu Langat, Selangor', '0387379012', 120, 118, 'OPEN', area[11], admin2],
        ['Dewan Komuniti Ampang', 'Jalan Ampang, 68000 Ampang, Selangor', '0342703456', 140, 63, 'OPEN', area[4], admin2],
        ['Masjid As-Salam Semenyih', 'Jalan Semenyih, 43500 Semenyih, Selangor', '0387237890', 100, 97, 'OPEN', area[14], admin2],
        ['Dewan Cheras Perdana', 'Jalan Cheras, 56100 Cheras, Kuala Lumpur', '0391321234', 200, 168, 'OPEN', area[23], admin2],
        ['Balai Raya Kepong', 'Jalan Kepong Baru, 52100 Kepong, Kuala Lumpur', '0362575678', 130, 94, 'OPEN', area[24], admin2],
        ['SK Shah Alam Seksyen 18', 'Seksyen 18, 40200 Shah Alam, Selangor', '0355129012', 180, 0, 'CLOSED', area[1], admin1],
        ['Dewan Komuniti Klang Selatan', 'Jalan Kapar, 42100 Klang, Selangor', '0333433456', 200, 0, 'CLOSED', area[3], admin1],
      ],
      'shelter_id'
    );
    const shl = shelters.map(r => r.shelter_id);

    // ---- VolunteerShelterAssignment (7) ----
    await insertRows(client, 'VolunteerShelterAssignment',
      ['volunteer_id', 'shelter_id'],
      [
        [vol[0], shl[0]],
        [vol[1], shl[1]],
        [vol[2], shl[4]],
        [vol[4], shl[5]],
        [vol[5], shl[6]],
        [vol[3], shl[7]],
        [vol[6], shl[8]],
      ]
    );

    // ---- Victim (35) ----
    await insertRows(client, 'Victim',
      ['name', 'age', 'gender', 'shelter_id', 'event_id', 'registered_by'],
      [
        ['Mohd Hafiz bin Ahmad',         35, 'MALE',   shl[0], evt[0], vol[0]],
        ['Nur Aisyah binti Mohd',        28, 'FEMALE', shl[0], evt[0], vol[0]],
        ['Amir bin Yusof',               45, 'MALE',   shl[0], evt[0], vol[0]],
        ['Fatimah binti Hassan',          62, 'FEMALE', shl[0], evt[0], vol[0]],
        ['Muhammad Iqbal bin Razak',       8, 'MALE',   shl[0], evt[0], vol[0]],
        ['Sarina binti Yusof',           31, 'FEMALE', shl[1], evt[0], vol[1]],
        ['Azlan bin Ibrahim',            42, 'MALE',   shl[1], evt[0], vol[1]],
        ['Kumar a/l Selvam',             55, 'MALE',   shl[1], evt[0], vol[1]],
        ['Haslina binti Ahmad',          38, 'FEMALE', shl[1], evt[0], vol[1]],
        ['Tan Wei Hao',                  22, 'MALE',   shl[2], evt[0], vol[0]],
        ['Priya a/p Krishnan',           29, 'FEMALE', shl[2], evt[0], vol[0]],
        ['Rizal bin Othman',             47, 'MALE',   shl[2], evt[0], vol[0]],
        ['Lim Siew Lan',                 56, 'FEMALE', shl[2], evt[0], vol[0]],
        ['Zainab binti Omar',            68, 'FEMALE', shl[3], evt[0], vol[1]],
        ['Danial bin Kamal',             15, 'MALE',   shl[3], evt[0], vol[1]],
        ['Chong Mei Fen',                33, 'FEMALE', shl[3], evt[0], vol[1]],
        ['Shahrul bin Nizam',            41, 'MALE',   shl[3], evt[0], vol[1]],
        ['Nur Hidayah binti Ismail',     24, 'FEMALE', shl[4], evt[0], vol[2]],
        ['Rajan a/l Muthu',              58, 'MALE',   shl[4], evt[0], vol[2]],
        ['Loh Jun Kai',                  19, 'MALE',   shl[4], evt[0], vol[2]],
        ['Siti Zubaidah binti Abdullah', 37, 'FEMALE', shl[5], evt[1], vol[4]],
        ['Zulkifli bin Hassan',          52, 'MALE',   shl[5], evt[1], vol[4]],
        ['Rosmah binti Talib',           44, 'FEMALE', shl[5], evt[1], vol[4]],
        ['Arif bin Sulaiman',            26, 'MALE',   shl[5], evt[1], vol[4]],
        ['Kamala a/p Rajan',             61, 'FEMALE', shl[6], evt[1], vol[5]],
        ['Faizal bin Mohd',              33, 'MALE',   shl[6], evt[1], vol[5]],
        ['Nurul Ain binti Razak',        17, 'FEMALE', shl[6], evt[1], vol[5]],
        ['Iskandar bin Ali',             40, 'MALE',   shl[7], evt[1], vol[3]],
        ['Noor Azizah binti Mohd Nor',   55, 'FEMALE', shl[7], evt[1], vol[3]],
        ['Kavitha a/p Subramaniam',      36, 'FEMALE', shl[7], evt[1], vol[3]],
        ['Chong Siew Mun',              48, 'FEMALE', shl[8], evt[2], vol[6]],
        ['Rashidah binti Karim',         39, 'FEMALE', shl[8], evt[2], vol[6]],
        ['Mohd Razif bin Ismail',        30, 'MALE',   shl[8], evt[2], vol[6]],
        ['Wan Norhaiza binti Wan Ahmad', 51, 'FEMALE', shl[9], evt[2], vol[6]],
        ['Thanesh a/l Maniam',           27, 'MALE',   shl[9], evt[2], vol[6]],
      ]
    );

    // ---- Resource (12) ----
    const resources = await insertRows(client, 'Resource',
      ['type', 'name', 'unit'],
      [
        ['WATER', 'Bottled Water', '500ml bottles'],
        ['WATER', 'Instant Powdered Milk', '1kg packs'],
        ['WATER', 'Electrolyte Solution (ORS)', '200ml sachets'],
        ['FOOD', 'Canned Beans', '400g cans'],
        ['FOOD', 'Instant Noodles', '75g packets'],
        ['FOOD', 'Rice', '5kg bags'],
        ['MEDICINE', 'Paracetamol', 'strips of 10 (500mg)'],
        ['MEDICINE', 'Oral Rehydration Salts', '5g sachets'],
        ['MEDICINE', 'Antiseptic Ointment', '15g tubes'],
        ['HYGIENE', 'Soap Bars', '100g bars'],
        ['HYGIENE', 'Sanitary Pads', 'packs of 10'],
        ['HYGIENE', 'Toothpaste', '100g tubes'],
      ],
      'resource_id'
    );
    const res = resources.map(r => r.resource_id);
    // Indices: 0=Water, 1=Milk, 2=ORS, 3=Beans, 4=Noodles, 5=Rice,
    // 6=Paracetamol, 7=ORS Salts, 8=Antiseptic, 9=Soap, 10=Sanitary, 11=Toothpaste

    // ---- Inventory ----
    // Supply levels tuned so need levels vary: CRITICAL, HIGH, MODERATE, LOW
    const shelterStock = [
      [shl[0], [[res[0],50],[res[1],10],[res[3],20],[res[4],30],[res[6],8],[res[9],15]]],
      [shl[1], [[res[0],120],[res[3],60],[res[5],40],[res[6],30],[res[10],20]]],
      [shl[2], [[res[0],200],[res[1],40],[res[3],100],[res[4],150],[res[8],30],[res[9],80]]],
      [shl[3], [[res[0],200],[res[4],180],[res[5],60],[res[6],30],[res[9],100],[res[10],45]]],
      [shl[4], [[res[0],150],[res[3],80],[res[5],30],[res[7],25],[res[11],40]]],
      [shl[5], [[res[0],40],[res[2],20],[res[4],30],[res[5],15],[res[8],10],[res[9],20]]],
      [shl[6], [[res[0],80],[res[3],50],[res[1],20],[res[6],15],[res[10],20]]],
      [shl[7], [[res[0],120],[res[5],30],[res[9],50],[res[7],20]]],
      [shl[8], [[res[0],100],[res[4],60],[res[3],40],[res[6],20],[res[11],25]]],
      [shl[9], [[res[0],80],[res[4],50],[res[9],20],[res[8],10]]],
    ];
    const inventoryRows = [];
    for (const [shelterId, items] of shelterStock) {
      for (const [resourceId, qty] of items) {
        inventoryRows.push([shelterId, resourceId, qty, org1]);
      }
    }
    await insertRows(client, 'Inventory',
      ['shelter_id', 'resource_id', 'quantity_available', 'updated_by'],
      inventoryRows
    );

    // ---- ResourceRequest (14) ----
    // Mix of statuses; PENDING/APPROVED drive need level, FULFILLED/REJECTED/REVOKED are excluded
    const requests = await insertRows(client, 'ResourceRequest',
      ['shelter_id', 'event_id', 'created_by', 'status'],
      [
        [shl[0], evt[0], vol[0], 'PENDING'],
        [shl[0], evt[0], vol[0], 'APPROVED'],
        [shl[1], evt[0], vol[1], 'PENDING'],
        [shl[1], evt[0], vol[1], 'APPROVED'],
        [shl[2], evt[0], vol[0], 'APPROVED'],
        [shl[3], evt[0], vol[1], 'FULFILLED'],
        [shl[4], evt[0], vol[2], 'PENDING'],
        [shl[5], evt[1], vol[4], 'APPROVED'],
        [shl[5], evt[1], vol[4], 'PENDING'],
        [shl[6], evt[1], vol[5], 'PENDING'],
        [shl[7], evt[1], vol[3], 'FULFILLED'],
        [shl[8], evt[2], vol[6], 'PENDING'],
        [shl[8], evt[2], vol[6], 'APPROVED'],
        [shl[9], evt[2], vol[6], 'APPROVED'],
      ],
      'request_id'
    );
    const req = requests.map(r => r.request_id);

    // ---- ResourceRequestItem ----
    await insertRows(client, 'ResourceRequestItem',
      ['request_id', 'resource_id', 'quantity'],
      [
        // shl[0] Klang — CRITICAL: supply~133, requested~450 → score≈3.4
        [req[0], res[0], 150], [req[0], res[5], 80],  [req[0], res[9], 40],
        [req[1], res[4], 60],  [req[1], res[6], 50],  [req[1], res[3], 70],

        // shl[1] Shah Alam — HIGH: supply~270, requested~440 → score≈1.6
        [req[2], res[0], 250], [req[2], res[6], 30],  [req[2], res[10], 40],
        [req[3], res[3], 80],  [req[3], res[5], 40],

        // shl[2] PJ — MODERATE: supply~600, requested~680 → score≈1.1
        [req[4], res[0], 300], [req[4], res[4], 200], [req[4], res[9], 100], [req[4], res[11], 80],

        // shl[3] Subang — LOW: FULFILLED request, excluded from calc → score=0
        [req[5], res[5], 60],  [req[5], res[2], 50],

        // shl[4] Puchong — MODERATE: supply~325, requested~410 → score≈1.3
        [req[6], res[0], 200], [req[6], res[3], 100], [req[6], res[7], 50],  [req[6], res[11], 60],

        // shl[5] Hulu Langat — CRITICAL: supply~135, requested~330 → score≈2.4
        [req[7], res[4], 150], [req[7], res[8], 40],  [req[7], res[7], 60],
        [req[8], res[0], 80],

        // shl[6] Ampang — HIGH: supply~185, requested~330 → score≈1.8
        [req[9], res[0], 180], [req[9], res[3], 80],  [req[9], res[1], 40],  [req[9], res[6], 30],

        // shl[7] Semenyih — LOW: FULFILLED request, excluded → score=0
        [req[10], res[9], 30],  [req[10], res[11], 20],

        // shl[8] Cheras — HIGH: supply~245, requested~440 → score≈1.8
        [req[11], res[0], 200], [req[11], res[4], 120],
        [req[12], res[3], 80],  [req[12], res[6], 40],

        // shl[9] Kepong — MODERATE: supply~160, requested~190 → score≈1.2
        [req[13], res[0], 100], [req[13], res[4], 60],  [req[13], res[9], 30],
      ]
    );

    // ---- Task (15) ----
    await insertRows(client, 'Task',
      ['title', 'description', 'status', 'assigned_to', 'created_by', 'shelter_id', 'event_id'],
      [
        ['Distribute bottled water to families',
          'Distribute bottled water rations to families staying in the main hall and classrooms.', 'COMPLETED', vol[0], org1, shl[0], evt[0]],
        ['Register new flood evacuees',
          'Process intake registration for newly arrived flood evacuees including personal details and medical needs.', 'IN_PROGRESS', vol[0], org1, shl[0], evt[0]],
        ['Set up medical aid station',
          'Prepare and organize the medical aid station with first aid supplies and medicine inventory.', 'COMPLETED', vol[1], org1, shl[1], evt[0]],
        ['Sort incoming food donations',
          'Sort, categorize, and store incoming food donations by type and expiry date.', 'PENDING', vol[1], org1, shl[1], evt[0]],
        ['Conduct shelter capacity assessment',
          'Assess current occupancy levels and identify available space for additional evacuees.', 'IN_PROGRESS', vol[2], org1, shl[4], evt[0]],
        ['Distribute hygiene kits to evacuees',
          'Assemble and distribute hygiene kits containing soap, toothpaste, and sanitary supplies.', 'PENDING', vol[0], org1, shl[2], evt[0]],
        ['Coordinate medical team visit',
          'Arrange schedule and logistics for visiting medical team to conduct health screenings.', 'REVOKED', vol[1], org1, shl[3], evt[0]],
        ['Assess landslide damage in surroundings',
          'Survey surrounding areas for structural damage and identify unsafe zones near the shelter.', 'COMPLETED', vol[4], org1, shl[5], evt[1]],
        ['Set up temporary clean water supply',
          'Install and test temporary water filtration system for clean drinking water access.', 'IN_PROGRESS', vol[4], org1, shl[5], evt[1]],
        ['Register displaced families',
          'Register newly displaced families arriving from affected landslide zones.', 'PENDING', vol[5], org1, shl[6], evt[1]],
        ['Distribute emergency food packs',
          'Prepare and distribute emergency food packs to all registered families in the shelter.', 'COMPLETED', vol[3], org1, shl[7], evt[1]],
        ['Inventory check for medicine supplies',
          'Conduct full inventory count of all medicine and medical supplies currently in stock.', 'IN_PROGRESS', vol[5], org1, shl[6], evt[1]],
        ['Clean and sanitize shelter area',
          'Perform deep cleaning and sanitization of all common areas and sleeping quarters.', 'PENDING', vol[6], org1, shl[8], evt[2]],
        ['Set up communication center',
          'Establish a communication center with charging stations and information board for evacuees.', 'PENDING', vol[6], org1, shl[9], evt[2]],
        ['Coordinate volunteer shift schedule',
          'Organize and communicate the weekly volunteer rotation schedule across all stations.', 'REVOKED', vol[3], org1, shl[7], evt[1]],
      ]
    );

    // ---- EmergencyReport (8) ----
    await insertRows(client, 'EmergencyReport',
      ['description', 'severity', 'status', 'area_id', 'reported_by'],
      [
        ['Flash flooding reported in Klang town center. Water levels rising rapidly near Jalan Meru with several roads impassable.', 'CRITICAL', 'VERIFIED', area[3], pub[0]],
        ['Road collapse detected near Shah Alam highway interchange. Multiple vehicles stranded and traffic diverted.', 'HIGH', 'OPEN', area[1], pub[1]],
        ['Severe supply shortage at Petaling Jaya shelter. Bottled water and food rations running critically low.', 'MEDIUM', 'VERIFIED', area[0], vol[0]],
        ['Potential water contamination risk in Subang Jaya. Floodwater has mixed with drainage near residential areas.', 'HIGH', 'VERIFIED', area[2], vol[1]],
        ['Landslide debris blocking main access road to Hulu Langat. Emergency vehicles unable to pass.', 'CRITICAL', 'OPEN', area[11], vol[4]],
        ['Electrical hazard identified at Ampang shelter. Exposed wiring near the entrance area after storm damage.', 'HIGH', 'VERIFIED', area[4], vol[5]],
        ['Storm causing localized flooding in Cheras low-lying areas. Several ground-floor units affected.', 'MEDIUM', 'OPEN', area[23], pub[2]],
        ['Minor structural damage to buildings in Kepong commercial area. Some roof panels displaced by strong winds.', 'LOW', 'OPEN', area[24], vol[6]],
      ]
    );

    // ---- EmergencyAnnouncement (4) ----
    await insertRows(client, 'EmergencyAnnouncement',
      ['title', 'message', 'created_by', 'event_id'],
      [
        ['Klang Valley Flood – Emergency Evacuation Notice',
          'All residents in low-lying areas of Klang, Shah Alam, Petaling Jaya, Subang Jaya, and Puchong are advised to evacuate immediately to designated shelters. Bring essential documents, medications, and personal items. Emergency hotline: 999.',
          admin1, evt[0]],
        ['Hulu Langat Landslide – Safety Advisory',
          'Multiple landslides have been reported in the Hulu Langat, Ampang, and Semenyih areas. Residents are urged to avoid hillside areas and report any signs of land movement. Evacuation shelters have been activated.',
          admin1, evt[1]],
        ['KL Storm Warning – Shelter Information',
          'Severe thunderstorm warning issued for Cheras, Kepong, Setapak, and Wangsa Maju. Temporary shelters are now open. Avoid travel unless absolutely necessary and stay away from flood-prone underpasses.',
          admin2, evt[2]],
        ['Relief Operations Update – Resource Distribution Schedule',
          'Resource distribution for all active shelters in the Klang Valley flood zone will follow a twice-daily schedule at 8:00 AM and 5:00 PM. Volunteers should report to their assigned shelters 30 minutes before distribution.',
          admin1, evt[0]],
      ]
    );

    await client.query('COMMIT');

    console.log('\n=== Database seeded successfully! ===\n');
    console.log('Test Accounts (all passwords: password123):');
    console.log('  Relief Org:  username = redcrescent');
    console.log('  Admin:       username = admin1');
    console.log('  Volunteer:   username = ahmad');
    console.log('  Public:      username = ali');
    console.log('');
    console.log('Data Summary:');
    console.log('  Users:               15  (2 admins, 2 orgs, 8 volunteers, 3 public)');
    console.log('  Areas:               32  (22 Selangor, 10 KL)');
    console.log('  Disaster Events:      5  (3 active, 2 resolved)');
    console.log('  Event-Area Links:    14');
    console.log('  Shelters:            12  (10 open, 2 closed)');
    console.log('  Volunteer Assign:     7');
    console.log('  Victims:             35');
    console.log('  Resources:           12  (3 per type)');
    console.log(`  Inventory:           ${inventoryRows.length}`);
    console.log('  Resource Requests:   14');
    console.log('  Request Items:       35');
    console.log('  Tasks:               15');
    console.log('  Emergency Reports:    8');
    console.log('  Announcements:        4');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nSeeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
