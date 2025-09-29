import express, { Request, Response } from "express";

import { QueryResult } from "pg";
import { query } from "../database/db"; // Importe la fonction query depuis db.ts
import { SunburstNode, MilieuxHumidesSunburstRow, } from "../interfaces/interfaces";
import format from 'pg-format';


const router = express.Router();

// Liste blanche des tables autorisées
const allowedTables: string[] = ["agri2022", "agri2023", "agri2024", "milieux_humides", "bati", "casernes", "interventions_pompiers", "reseau_express_velo"];

type GeoJSONGeom = { type: string; coordinates: any };
let currentSelection: { geometry: GeoJSONGeom } | null = null; // GeoJSON Feature (Polygon/MultiPolygon)

// let currentSelection: { geometry: { type: string; coordinates: any } } | null = null;


// Route existante pour le GeoJSON (inchangée, mais typée)
router.get("/geojson/:table", async (req: Request, res: Response) => {
  const table = req.params.table; // Convertit le paramètre en minuscules pour la comparaison

  // Pagination parameters
  const limit = parseInt(req.query.limit as string || '100', 10); // Default to 1000 features
  const offset = parseInt(req.query.offset as string || '0', 10); // Default to 0 offset

  if (isNaN(limit) || limit <= 0 || isNaN(offset) || offset < 0) {
    return res.status(400).send("Les paramètres 'limit' et 'offset' doivent être des nombres positifs.");
  }

  if (!table) {
    return res.status(400).send('Le paramètre "table" est requis.');
  }

  if (!allowedTables.includes(table)) {
    console.warn(`Tentative d'accès à une table non autorisée: ${table}`);
    return res.status(400).send("Table non autorisée");
  }

  try {
    const result: QueryResult = await query(`
      SELECT jsonb_build_object(
        'type',      'FeatureCollection',
        'features',  jsonb_agg(
          jsonb_build_object(
            'type',      'Feature',
            'geometry',  ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(row) - 'geom'
          )
        )
      ) AS geojson
      FROM (
        SELECT * FROM ${table}
      ) AS row;
    `);

    if (result.rows.length === 0 || !result.rows[0].geojson) {
      return res.status(404).send("Aucune donnée trouvée pour cette table.");
    }

    return res.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Erreur lors de la requête à PostGIS");
  }
});

//// Créer/remplacer la sélection spatiale
router.post('/selection', (req: Request, res: Response) => {
  const body = req.body || {};
  // accepte soit { geometry: ... }, soit un GeoJSON FeatureCollection { features:[{ geometry }]}
  const geometry =
    body.geometry ??
    body?.features?.[0]?.geometry ??
    body;

  if (!geometry?.type || !geometry?.coordinates) {
    return res.status(400).json({ error: 'Geometry GeoJSON requis' });
  }

  currentSelection = { geometry };
  console.log('[selection] ✅ sélection enregistrée');
  return res.json({
    ok: true
  });

});

// Supprimer la sélection
router.delete('/selection', (_req: Request, res: Response) => {
  currentSelection = null;
  console.log('[selection] 🗑️ sélection supprimée');
  return res.json({ ok: true });
});

// (optionnel) Inspecter la sélection actuelle
router.get('/selection', (_req: Request, res: Response) => {
  return res.json({ selection: currentSelection });
});


// REQUETES POUR LES DIAGRAMMES PREDEFINIS

const allowedPresetTypes = ['pie', 'bar', 'bar_groupé', 'ligne'] as const;


router.post('/presets', async (req: Request, res: Response) => {
  // 1. On affiche le corps complet de la requête pour le débogage.
  console.log("BACKEND REÇOIT - CORPS DE LA REQUÊTE :", req.body);
  console.dir(req.body, { depth: null });
  try {
    // 2. On extrait les données du corps de la requête.
    const {
      name,
      type,
      schema_version = 1,
      is_public = false,
      owner_id = null,
      config // L'objet de configuration complet
    } = req.body;

    // 3. On vérifie que les données minimales sont présentes.
    if (!name || !type || !config) {
      return res.status(400).json({ error: "Les champs 'name', 'type', et 'config' sont requis." });
    }

    // 4. On prépare la requête SQL.
    const sql = `
            INSERT INTO chart_presets (name, type, schema_version, is_public, owner_id, config)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

    // 5. On prépare les paramètres.
    //    On s'assure de convertir l'objet 'config' en chaîne JSON. C'est la méthode la plus sûre.
    const params = [
      name,
      type,
      schema_version,
      is_public,
      owner_id,
      JSON.stringify(config)
    ];

    // 6. On exécute la requête.
    const { rows } = await query(sql, params);

    // 7. On renvoie une réponse de succès avec les données insérées.
    console.log("SUCCÈS : Données insérées dans la base de données.");
    return res.status(201).json(rows[0]);

  } catch (e: any) {
    if (e.code === '23505') {
      console.warn(`[presets] Violation de contrainte unique : le nom '${req.body.name}' existe déjà pour l'utilisateur '${req.body.owner_id}'.`);
      return res.status(409).json({ error: "Ce nom de preset est déjà utilisé." });
    }
    // 8. En cas d'erreur, on l'affiche et on renvoie une erreur 500.
    console.error('[presets] ERREUR LORS DE LA CRÉATION :', e);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

router.get('/presets', async (_req: Request, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT id, name, type, schema_version, is_public, owner_id, config, created_at, updated_at
       FROM chart_presets
       ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (e) {
    console.error('[presets] list error:', e);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

router.get('/presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT id, name, type, schema_version, is_public, owner_id, config, created_at, updated_at
       FROM chart_presets WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Preset introuvable' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('[presets] get error:', e);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

router.put('/presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, is_public, owner_id, schema_version, config } = req.body || {};

    if (type && !allowedPresetTypes.includes(type)) {
      return res.status(400).json({ error: `type invalide. Attendu: ${allowedPresetTypes.join(', ')}` });
    }

    const { rows } = await query(
      `UPDATE chart_presets
       SET
         name = COALESCE($1, name),
         type = COALESCE($2, type),
         is_public = COALESCE($3, is_public),
         owner_id = COALESCE($4, owner_id),
         schema_version = COALESCE($5, schema_version),
         config = COALESCE($6, config),
         updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, type, schema_version, is_public, owner_id, config, created_at, updated_at`,
      [name ?? null, type ?? null, is_public ?? null, owner_id ?? null, schema_version ?? null, config ?? null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Preset introuvable' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('[presets] update error:', e);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

router.delete('/presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rowCount } = await query(`DELETE FROM chart_presets WHERE id = $1`, [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Preset introuvable' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[presets] delete error:', e);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});



// requete pour les diagramme en bar groupé

router.post('/chart-data/bar-grouped', async (req: Request, res: Response) => {
  const {
    tableNames,
    dimensionColumn,
    categoryColumn,
    valueColumn,
    includeNulls = false,
    unspecifiedLabel = 'Non spécifié',
    useSelection = false,
    geomColumn = 'geom'
  } = req.body;

  if (!Array.isArray(tableNames) || tableNames.length < 1) {
    return res.status(400).send('tableNames[] requis.');
  }
  if (!dimensionColumn || !categoryColumn || !valueColumn) {
    return res.status(400).send('dimensionColumn, categoryColumn, valueColumn requis.');
  }
  if (tableNames.some(t => !allowedTables.includes(t))) {
    return res.status(400).send('Table non autorisée.');
  }

  try {
    // Vérifier colonnes sur chaque table
    for (const t of tableNames) {
      const { rows } = await query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1`,
        [t]
      );
      const cols = rows.map(r => r.column_name);
      if (!cols.includes(dimensionColumn) || !cols.includes(categoryColumn) || !cols.includes(valueColumn)) {
        return res.status(400).send(`Colonnes invalides dans ${t}.`);
      }
      if (useSelection && !cols.includes(geomColumn)) {
        return res.status(400).send(`Colonne géométrique "${geomColumn}" absente de ${t}.`);
      }
    }

    const dimExpr = includeNulls
      ? format("COALESCE(%I::text, %L)", dimensionColumn, unspecifiedLabel)
      : format("%I::text", dimensionColumn);
    const catExpr = includeNulls
      ? format("COALESCE(%I::text, %L)", categoryColumn, unspecifiedLabel)
      : format("%I::text", categoryColumn);

    const whereParts: string[] = [];
    if (!includeNulls) {
      whereParts.push(format("%I IS NOT NULL", dimensionColumn));
      whereParts.push(format("%I IS NOT NULL", categoryColumn));
    }

    // 🔐 param $1 = GeoJSON ; auto-SRID
    const hasSel = !!currentSelection?.geometry;
    let params: any[] = [];
    if (useSelection && hasSel) {
      whereParts.push(
        format(
          "ST_Intersects(%1$I, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326), ST_SRID(%1$I)))",
          geomColumn
        )
      );
      params = [JSON.stringify(currentSelection!.geometry)];
      console.log('[bar_grouped] filtre spatial actif ✅');
    } else {
      console.log('[bar_grouped] filtre spatial inactif ❌ (useSelection=%s, hasSelection=%s)', useSelection, hasSel);
    }

    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // UNION ALL des tables
    const unions: string[] = tableNames.map(t =>
      format(
        `SELECT %s AS dim, %s AS cat, (%I)::numeric AS val FROM %I t %s`,
        dimExpr, catExpr, valueColumn, t, whereSQL
      )
    );

    const sql = `
      WITH src AS (
        ${unions.join(' UNION ALL ')}
      )
      SELECT cat, dim, SUM(val) AS value
      FROM src
      GROUP BY 1,2
      ORDER BY cat, dim;
    `;

    const { rows } = await query(sql, params);

    // Pivot
    const dims = Array.from(new Set(rows.map(r => r.dim))).sort();
    const idx = new Map(dims.map((d, i) => [d, i]));
    const byCat = new Map<string, number[]>();
    for (const r of rows) {
      if (!byCat.has(r.cat)) byCat.set(r.cat, new Array(dims.length).fill(0));
      byCat.get(r.cat)![idx.get(r.dim)!] = Number(r.value) || 0;
    }
    const header = ['__header__', ...dims];
    const matrix = [header, ...Array.from(byCat.entries()).map(([cat, arr]) => [cat, ...arr])];

    console.log('[bar_grouped] useSel=%s dims=%d cats=%d', useSelection, dims.length, byCat.size);
    return res.json(matrix);
  } catch (e) {
    console.error('[bar_grouped] Erreur:', e);
    return res.status(500).send('Erreur interne du serveur.');
  }
});


// requete pour obtenir les données agrégées pour un diagramme en secteurs et diagramme en bar





router.post("/chart-data/pie", async (req: Request, res: Response) => {
  console.log('[pie] Body reçu:', JSON.stringify(req.body));
  const {
    tableName,
    categoryColumn,
    valueColumn,
    includeNulls = false,
    unspecifiedLabel = 'Non spécifié',
    geomColumn = 'geom'
  } = req.body || {};

  // Unifier les sources du flag
  const bodyUseSel = !!req.body?.useSelection;
  const queryUseSel = String(req.query.useSelection || '0') === '1';
  const headerUseSel = ['1', 'true', 'yes'].includes(String(req.get('x-use-selection') || '').toLowerCase());
  const useSelection = bodyUseSel || queryUseSel || headerUseSel;

  const selectionGeom = currentSelection?.geometry;
  const hasSelection = !!selectionGeom;

  console.log('[pie] useSelection =', useSelection);
  console.log('[pie] hasSelection =', hasSelection);
  console.log('[pie] body.useSelection=%s  query=%s  header=%s  => useSelection=%s',
    bodyUseSel, queryUseSel, headerUseSel, useSelection);

  if (!tableName || !categoryColumn || !valueColumn) {
    return res.status(400).send("Les paramètres tableName, categoryColumn, et valueColumn sont requis.");
  }
  if (!allowedTables.includes(tableName)) {
    return res.status(400).send("Table non autorisée.");
  }

  try {
    // Vérif colonnes
    const columnsResult = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    const validColumns = columnsResult.rows.map(r => r.column_name);
    if (!validColumns.includes(categoryColumn) || !validColumns.includes(valueColumn)) {
      return res.status(400).send("Une ou plusieurs colonnes spécifiées sont invalides.");
    }
    if (useSelection && !validColumns.includes(geomColumn)) {
      return res.status(400).send(`Colonne géométrique "${geomColumn}" absente de ${tableName}.`);
    }

    const nameExpr = includeNulls
      ? format("COALESCE(%I::text, %L)", categoryColumn, unspecifiedLabel)
      : format("%I", categoryColumn);

    const whereParts: string[] = [];
    if (!includeNulls) whereParts.push(format("%I IS NOT NULL", categoryColumn));

    // -- Paramètres SQL (pour $1)
    let params: any[] = [];

    // Filtre spatial auto-SRID (si demandé et disponible)
    if (useSelection && selectionGeom) {
      whereParts.push(
        format(
          "ST_Intersects(%1$I, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326), ST_SRID(%1$I)))",
          geomColumn
        )
      );
      params = [JSON.stringify(selectionGeom)]; // <-- $1
      console.log('[pie] filtre spatial actif ✅ (auto-SRID)');
    } else {
      console.log('[pie] filtre spatial inactif ❌ (useSelection=%s, hasSelection=%s)', useSelection, hasSelection);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const sqlQuery = format(
      `SELECT %s AS name, SUM(%I::numeric) AS value
       FROM %I
       %s
       GROUP BY 1
       ORDER BY value DESC;`,
      nameExpr, valueColumn, tableName, whereClause
    );

    console.log('[pie] SQL =>', sqlQuery, params.length ? ' (avec $1=GeoJSON)' : '');
    const { rows } = await query(sqlQuery, params);

    if (!rows.length) return res.status(404).send("Aucune donnée trouvée pour cette configuration.");
    return res.json(rows);

  } catch (err) {
    console.error("Erreur pie:", err);
    return res.status(500).send("Erreur interne du serveur.");
  }
});






// requete pour obtenir les diagramme en ligne


router.post('/chart-data/line', async (req: Request, res: Response) => {
  const {
    tableName,
    tableNames,
    xColumn,
    valueColumn,
    seriesColumn = null,
    includeNulls = false,
    useSelection = false,
    geomColumn = 'geom'
  } = req.body;

  const tables: string[] =
    Array.isArray(tableNames) && tableNames.length ? tableNames
      : tableName ? [tableName]
        : [];

  if (!tables.length) return res.status(400).send('tableName ou tableNames requis.');
  if (!xColumn || !valueColumn) return res.status(400).send('xColumn et valueColumn requis.');
  if (tables.some(t => !allowedTables.includes(t))) return res.status(400).send('Table non autorisée.');

  try {
    // Validate columns
    for (const t of tables) {
      const { rows } = await query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1`,
        [t]
      );
      const cols = rows.map(r => r.column_name);
      if (!cols.includes(xColumn) || !cols.includes(valueColumn)) {
        return res.status(400).send(`Colonnes invalides dans ${t}.`);
      }
      if (seriesColumn && !cols.includes(seriesColumn)) {
        return res.status(400).send(`seriesColumn "${seriesColumn}" absente de ${t}.`);
      }
      if (useSelection && !cols.includes(geomColumn)) {
        return res.status(400).send(`Colonne géométrique "${geomColumn}" absente de ${t}.`);
      }
    }

    const xExpr = includeNulls
      ? format("COALESCE(%I::text, %L)", xColumn, 'Non spécifié')
      : format("%I::text", xColumn);
    const sExpr = seriesColumn
      ? (includeNulls
        ? format("COALESCE(%I::text, %L)", seriesColumn, 'Non spécifié')
        : format("%I::text", seriesColumn))
      : null;

    const whereParts: string[] = [];
    if (!includeNulls) {
      whereParts.push(format("%I IS NOT NULL", xColumn));
      if (seriesColumn) whereParts.push(format("%I IS NOT NULL", seriesColumn));
    }

    // 🔐 param $1 = GeoJSON ; auto-SRID
    const hasSel = !!currentSelection?.geometry;
    let params: any[] = [];
    if (useSelection && hasSel) {
      whereParts.push(
        format(
          "ST_Intersects(%1$I, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326), ST_SRID(%1$I)))",
          geomColumn
        )
      );
      params = [JSON.stringify(currentSelection!.geometry)];
      console.log('[line] filtre spatial actif ✅');
    } else {
      console.log('[line] filtre spatial inactif ❌ (useSelection=%s, hasSelection=%s)', useSelection, hasSel);
    }

    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    let sql: string;
    if (seriesColumn) {
      // multi/mono avec seriesColumn -> 1 série par valeur
      const unions = tables.map(t =>
        format(
          `SELECT %s AS x, %s AS s, (%I)::numeric AS v FROM %I t %s`,
          xExpr, sExpr!, valueColumn, t, whereSQL
        )
      );
      sql = `
        WITH src AS (
          ${unions.join(' UNION ALL ')}
        )
        SELECT s AS series, x, SUM(v) AS value
        FROM src
        GROUP BY 1,2
        ORDER BY 1,2;
      `;
    } else if (tables.length > 1) {
      // multi sans seriesColumn -> 1 série par table
      const unions = tables.map(t =>
        format(
          `SELECT %s AS x, %L AS s, (%I)::numeric AS v FROM %I t %s`,
          xExpr, t, valueColumn, t, whereSQL
        )
      );
      sql = `
        WITH src AS (
          ${unions.join(' UNION ALL ')}
        )
        SELECT s AS series, x, SUM(v) AS value
        FROM src
        GROUP BY 1,2
        ORDER BY 1,2;
      `;
    } else {
      // mono -> série unique
      const t = tables[0];
      sql = format(
        `SELECT %s AS x, SUM(%I::numeric) AS value
         FROM %I t
         %s
         GROUP BY 1
         ORDER BY 1;`,
        xExpr, valueColumn, t, whereSQL
      );
    }

    const { rows } = await query(sql, params);

    if (!seriesColumn && tables.length === 1) {
      const x = rows.map(r => r.x);
      const data = rows.map(r => Number(r.value) || 0);
      return res.json({ x, series: [{ name: 'Total', data }] });
    }

    const xAll = Array.from(new Set(rows.map(r => r.x))).sort();
    const xIdx = new Map(xAll.map((v, i) => [v, i]));
    const seriesNames = Array.from(new Set(rows.map(r => r.series))).sort();

    const bySeries = new Map<string, number[]>(
      seriesNames.map(s => [s, new Array(xAll.length).fill(0)])
    );
    for (const r of rows) {
      bySeries.get(r.series)![xIdx.get(r.x)!] = Number(r.value) || 0;
    }

    const series = seriesNames.map(name => ({ name, data: bySeries.get(name)! }));
    console.log('[line] useSel=%s series=%d x=%d', useSelection, series.length, xAll.length);
    return res.json({ x: xAll, series });
  } catch (e) {
    console.error('[line] Erreur:', e);
    return res.status(500).send('Erreur interne du serveur.');
  }
});


// Nouvelle route pour les données Sunburst des milieux humides (basée sur le compte)




router.get("/sunburst-milieux-humides", async (req: Request, res: Response) => {
  try {
    // Requête SQL pour compter les occurrences par classe et pression_1
    const sqlQuery = `
      SELECT
          classe,
          pression_1,
          COUNT(*) AS count_records -- Compte le nombre d'occurrences
      FROM
          milieux_humides
      WHERE
          classe IS NOT NULL AND pression_1 IS NOT NULL
      GROUP BY
          classe, pression_1
      ORDER BY
          classe; -- Ordre par classe pour une construction hiérarchique stable
    `;

    // Typage des lignes de résultat pour la requête Sunburst
    const { rows }: { rows: MilieuxHumidesSunburstRow[] } = await query(sqlQuery);

    if (rows.length === 0) {
      return res.status(404).send("Aucune donnée trouvée pour le graphique Sunburst des milieux humides.");
    }

    // Transformer les données pour le format Sunburst (hiérarchique)
    const sunburstData: SunburstNode[] = [];
    const classesMap = new Map<string, SunburstNode>();

    rows.forEach(row => {
      const classe = row.classe || 'Inconnu';
      const pression1 = row.pression_1 || 'Aucune pression';
      const count = row.count_records != null ? row.count_records : 0; // Utilise le compte comme valeur

      let parentNode = classesMap.get(classe);
      if (!parentNode) {
        parentNode = {
          name: classe,
          children: []
        };
        classesMap.set(classe, parentNode);
        sunburstData.push(parentNode);
      }

      // S'assurer que children est initialisé avant d'ajouter
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push({
        name: pression1,
        value: count // La valeur est maintenant le nombre d'occurrences
      });
    });

    return res.json(sunburstData);

  } catch (err) {
    console.error("Erreur lors de la requête des données Sunburst pour les milieux humides:", err);
    return res.status(500).send("Erreur interne du serveur lors de la récupération des données Sunburst.");
  }
});

// route pour obtenir la liste et le type des colonnes

router.get("/columns/:table", async (req: Request, res: Response) => {
  const table = req.params.table;

  if (!table) {
    return res.status(400).send("Le paramètre 'table' est manquant dans l'URL.");
  }

  if (!allowedTables.includes(table)) {
    return res.status(400).send("Table non autorisée");
  }

  try {
    // 1. Exécutez la requête et attendez le résultat de la base de données
    const result = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name NOT IN ('gid', 'geom', 'index');
    `, [table]);

    // 2. Transformez le résultat avec .map() juste après avoir reçu la réponse
    const columnsInfo = result.rows.map(row => ({ name: row.column_name, type: row.data_type }));

    // 3. Renvoyez le résultat transformé au frontend
    return res.json(columnsInfo);

  } catch (err) {
    console.error(`Erreur lors de la récupération des colonnes pour la table ${table}:`, err);
    return res.status(500).send("Erreur interne du serveur.");
  }
});



// verification du type et de la structure de chaque fichier compatible pour le gaphique en bar groupé

router.post("/validate-layer-structure", async (req: Request, res: Response) => {
  const { tableNames } = req.body;

  if (!Array.isArray(tableNames) || tableNames.length === 0) {
    return res.status(400).send("Le paramètre tableNames est requis.");
  }

  try {
    // VERSION DE DIAGNOSTIC : On récupère les schémas détaillés de chaque table
    const result = await query(`
      SELECT
        table_name,
        jsonb_agg(jsonb_build_object('name', column_name, 'type', data_type) ORDER BY column_name) as schema_def
      FROM information_schema.columns
      WHERE table_name = ANY($1::text[])
        AND table_schema = 'public'
        AND column_name NOT IN ('gid', 'geom', 'index')
      GROUP BY table_name;
    `, [tableNames]);

    // On renvoie directement les schémas générés pour pouvoir les inspecter
    return res.json(result.rows);

  } catch (err) {
    console.error("Erreur lors de la validation de la structure des couches:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }





});
export default router;
