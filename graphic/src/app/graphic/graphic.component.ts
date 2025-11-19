import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';

// Import services and types
import { ApiService } from '../api.service';
import { GraphicPrefineServiceApi, Preset } from '../graphic.prefine.service.api';


import { switchMap, map, throwError, Observable } from 'rxjs';

// Import the modal component pour personnalisation
import { ModalGraphicComponent } from './modal.graphic.component';

// Interface pour typer le résultat combiné
interface PresetWithData {
    preset: Preset;
    chartData: any;
}

@Component({
    selector: 'app-graphic',
    standalone: true,
    imports: [
        CommonModule, MatButtonModule, MatIconModule, MatTooltipModule,
        DragDropModule, MatDialogModule, NgxEchartsModule, FormsModule, MatMenuModule
    ],
    templateUrl: './graphic.component.html',
    styleUrls: ['./graphic.component.css']
})
export class GraphicComponent implements OnInit {

    // --- PROPRIÉTÉS DE GESTION DE L'ÉTAT DE L'INTERFACE ---
    isPanelOpen = false; // ouverture et fermeture du panneau principal
    currentView: 'library' | 'chart' = 'library'; // Détermine si on affiche la grille de sélection ou un graphique .
    chartOptions: EChartsOption | null = null;  // Stocke la configuration ECharts complète du graphique actuellement affiché.
    activeChartTitle: string = 'Bibliothèque de Graphiques'; // Gère le titre affiché dans l'en-tête du panneau.

    // AJOUTS POUR LE TABLEAU DE DONNÉES 
    showDataTable = false; // Flag pour afficher/masquer le tableau
    tableColumns: string[] = []; // Clés internes des colonnes (ex: 'Catégorie')
    tableColumnAliases: { [key: string]: string } = {}; // Alias affichés (ex: { 'Catégorie': 'Produit' })
    tableData: any[] = []; // Données formatées pour le tableau


    @ViewChild('chartHost') chartHost!: ElementRef<HTMLDivElement>;
    private resizeObserver?: ResizeObserver;
    private lastLoadedPreset: Preset | null = null;
    private lastLoadedChartData: any = null;
    private resizeDebounceTimer: any;

    //   Propriété pour stocker l'instance ECharts
    private echartsInstance: any;

    // Stocke la liste des graphiques appartenant à l'administrateur ou à un users.
    adminPresets: Preset[] = [];
    userPresets: Preset[] = [];

    //propriété pour le filtre spatial
    private useSpatialFilter = false;



    // configuration de l'apercu des graphiques

    previewBoxes = [
        {
            id: 'da9beb0e-0baa-45ae-9602-07434dcc6083', // id des digrammes choisis dans la bd

            title: 'Répartition par Type',
            svgPath: 'assets/pie.svg'
        },
        {
            id: 'dd1d005e-f765-44d8-a4b7-1d3c22b25635',
            title: 'Agriculture 2022',
            svgPath: '/assets/agriculture 2022.svg'
        },
        {
            id: 'f208118e-d8c6-49b4-a0b9-3b172242189b',
            title: 'Evolution agricole',
            svgPath: '/assets/evolution_agricole.svg'
        },
        {
            id: 'cfd5d031-bbc8-4fe5-ad00-f85ef105721b',
            title: 'Production agricole 2022',
            svgPath: '/assets/production_agricole_2022.svg'
        },
        {
            id: '83b01047-0d47-466f-8a65-f6c760ae775a',
            title: 'Production agricole 2023',
            svgPath: '/assets/production_agricole_2023.svg'
        },
        {
            id: 'fb2e44dc-654b-4cbe-80d9-aa6c676e5b94',
            title: 'Production 2022',
            svgPath: '/assets/production 2022.svg'
        }
    ];


    //Propriété pour préparer et afficher le tableau des données//
    private _prepareTableData(): void {
        this.tableColumns = [];
        this.tableColumnAliases = {};
        this.tableData = [];

        if (!this.lastLoadedPreset || !this.lastLoadedChartData) {
            console.warn('_prepareTableData: Données de preset ou de graphique manquantes.');
            return;
        }

        const presetType = this.lastLoadedPreset.type;
        const chartData = this.lastLoadedChartData;
        // Récupère les alias sauvegardés ou un objet vide
        const savedAliases = this.lastLoadedPreset.config.columnAliases || {};

        try {
            if (presetType === 'pie' || presetType === 'bar') {
                if (Array.isArray(chartData) && chartData.length > 0) {
                    this.tableColumns = ['Catégorie', 'Valeurs'];
                    // Initialise les alias avec les valeurs sauvegardées OU les clés par défaut
                    this.tableColumnAliases = {
                        'Catégorie': savedAliases['Catégorie'] || 'Catégorie',
                        'Valeurs': savedAliases['Valeurs'] || 'Valeurs'
                    };
                    this.tableData = chartData.map(item => ({
                        'Catégorie': item.name,
                        'Valeurs': item.value
                    }));
                }
            } else if (presetType === 'bar_groupé') {
                if (Array.isArray(chartData) && chartData.length > 1) {
                    this.tableColumns = ['Dimension', 'Catégorie', 'Valeur'];
                    // Initialise les alias
                    this.tableColumnAliases = {
                        'Dimension': savedAliases['Dimension'] || 'Dimension',
                        'Catégorie': savedAliases['Catégorie'] || 'Catégorie',
                        'Valeur': savedAliases['Valeur'] || 'Valeur'
                    };
                    const dimensions = chartData[0].slice(1);
                    const categoriesData = chartData.slice(1);
                    this.tableData = [];
                    categoriesData.forEach(row => {
                        const categorie = row[0];
                        dimensions.forEach((dimension: string, index: number) => {
                            this.tableData.push({
                                'Dimension': dimension,
                                'Catégorie': categorie,
                                'Valeur': row[index + 1]
                            });
                        });
                    });
                }
            } else if (presetType === 'ligne') {
                // Assumons que chartData est { x: string[], series: { name: string, data: number[] }[] }
                if (chartData && chartData.x && chartData.series) {
                    // Détermine si on doit utiliser 3 colonnes basé sur la config sauvegardée ou le nombre de séries
                    const hasSeriesColumn = this.lastLoadedPreset.config.seriesColumn || chartData.series.length > 1;

                    if (hasSeriesColumn) {
                        this.tableColumns = ['Dimension', 'Catégorie', 'Valeur'];
                        // Initialise les alias
                        this.tableColumnAliases = {
                            'Dimension': savedAliases['Dimension'] || 'Dimension',
                            'Catégorie': savedAliases['Catégorie'] || 'Catégorie',
                            'Valeur': savedAliases['Valeur'] || 'Valeur'
                        };
                        this.tableData = [];
                        chartData.series.forEach((serie: { name: string, data: number[] }) => {
                            chartData.x.forEach((dim: string, index: number) => {
                                this.tableData.push({
                                    'Dimension': dim,
                                    'Catégorie': serie.name,
                                    'Valeur': serie.data[index]
                                });
                            });
                        });
                    } else {
                        // Cas simple : 2 colonnes
                        this.tableColumns = ['Catégorie', 'Valeur'];
                        // Initialise les alias
                        this.tableColumnAliases = {
                            'Catégorie': savedAliases['Catégorie'] || 'Catégorie',
                            'Valeur': savedAliases['Valeur'] || 'Valeur'
                        };
                        const firstSeries = chartData.series[0];
                        if (firstSeries) {
                            this.tableData = chartData.x.map((cat: string, index: number) => ({
                                'Catégorie': cat,
                                'Valeur': firstSeries.data[index]
                            }));
                        }
                    }
                }
            }
            console.log('Table data prepared:', {
                columns: this.tableColumns,
                aliases: this.tableColumnAliases,
                dataCount: this.tableData.length
            });
        } catch (error) {
            console.error("Erreur lors de la préparation des données pour le tableau :", error);
            this.tableColumns = ['Erreur'];
            this.tableColumnAliases = { 'Erreur': 'Erreur' };
            this.tableData = [{ 'Erreur': 'Impossible de formater les données.' }];
        }
    }


    constructor(
        public dialog: MatDialog,
        private apiService: ApiService,
        private presetApiService: GraphicPrefineServiceApi
    ) { }

    ngOnInit(): void {
        this.loadPresetLists();
    }

    //  Méthode appelée par (chartInit)
    onChartInit(instance: any) {
        this.echartsInstance = instance;
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    //==Affiche ou masque le panneau principal==//
    togglePanel(): void {
        this.isPanelOpen = !this.isPanelOpen;
        if (this.isPanelOpen) {
            this.loadPresetLists();
        }
    }

    // ==Recupere tous les presets ou graphique present dans la base de donnée==//
    loadPresetLists(): void {

        console.log("Chargement des listes de presets depuis l'API...");
        this.presetApiService.listPresets().subscribe({
            next: (allPresets) => {
                this.adminPresets = allPresets.filter(p => p.owner_id === 'admin');
                this.userPresets = allPresets.filter(p => p.owner_id !== 'admin');

                console.log("Presets admin chargés:", this.adminPresets.length);
                console.log("Presets utilisateur chargés:", this.userPresets.length);
            },
            error: (err) => console.error("Erreur lors du chargement des listes de presets:", err)
        });
    }


    // ==Réinitialisation de la vue pour afficher la grille de sélection.==//
    showGrid(): void {
        this.currentView = 'library';
        this.activeChartTitle = 'Bibliothèque de Graphiques';
        this.chartOptions = null;
        this.useSpatialFilter = false;

        //  On nettoie l'observateur et les données quand on retourne à la grille
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.lastLoadedPreset = null;
        this.lastLoadedChartData = null;
    }


    /**
  * Orchestre le processus complet de chargement d'un graphique :
  * 1. Récupère la configuration le preset depuis la DB.
  * 2. Utilise cette configuration pour faire une deuxième requête afin d'obtenir les données.
  * 3. Appelle la méthode pour construire et afficher le graphique.
  */
    loadPreset(presetId: string): void {

        console.log(`1. Début du chargement pour le preset ID: ${presetId}`);
        this.activeChartTitle = 'Chargement...';
        this.currentView = 'chart';
        this.chartOptions = null;

        // RÉINITIALISER LE FILTRE (SI NÉCESSAIRE) 
        // Si l'ID demandé est DIFFÉRENT du dernier chargé,
        // c'est un nouveau graphique, donc on désactive le filtre.
        if (this.lastLoadedPreset?.id !== presetId) {
            this.useSpatialFilter = false;
        }



        setTimeout(() => {
            this.presetApiService.getPreset(presetId).pipe(
                switchMap((preset: Preset) => {
                    const config = preset.config;

                    //  APPLIQUER LE FILTRE AU CONFIG et utiliser l'état actuel du filtre.
                    config.useSelection = this.useSpatialFilter;

                    if (config.tables && !config.tableNames) {
                        config.tableNames = config.tables;
                        delete config.tables;
                    }

                    let dataRequest$: Observable<any>;
                    switch (preset.type) {
                        case 'pie': case 'bar':
                            dataRequest$ = this.apiService.getPieChartData(config, this.useSpatialFilter);
                            break;
                        case 'bar_groupé':
                            dataRequest$ = this.apiService.getBarGroupedChartData(config);
                            break;
                        case 'ligne':
                            dataRequest$ = this.apiService.getLineChartData(config);
                            break;



                        default:
                            return throwError(() => new Error(`Unknown chart type: ${preset.type}`));
                    }

                    // On retourne un objet explicite au lieu d'un tableau (tuple).
                    // Cela aide TypeScript à comprendre la structure des données.
                    return dataRequest$.pipe(
                        map(chartData => ({ preset, chartData } as PresetWithData))
                    );
                })
            ).subscribe({
                //   On reçoit un objet 'result' et on accède à ses propriétés.

                next: (result: PresetWithData) => {
                    console.log('Données de la requête reçues (result.chartData):', result.chartData);
                    //  MODIFICATION : On stocke les données pour pouvoir les réutiliser
                    this.lastLoadedPreset = result.preset;
                    this.lastLoadedChartData = result.chartData;

                    //  Préparation des données pour le tableau 
                    this._prepareTableData();
                    this.showDataTable = false; // Masque le tableau par défaut lors du chargement


                    // On construit le graphique une première fois
                    this.chartOptions = this._buildChartOptionsFromPreset(result.preset, result.chartData);
                    this.activeChartTitle = result.preset.name;

                    //  On attache l'observateur pour les futurs redimensionnements
                    this.setupResizeObserver();

                    if (this.echartsInstance) {
                        setTimeout(() => {
                            this.echartsInstance.resize();
                        }, 0);
                    }

                },
                error: (err) => {
                    this.activeChartTitle = "Erreur de chargement";
                    this.chartOptions = { title: { text: 'Impossible de charger le graphique.' } };
                    console.error("Error during chart loading:", err);

                    //  Vider les données du tableau en cas d'erreur 
                    this.tableColumns = [];
                    this.tableColumnAliases = {};
                    this.tableData = [];
                    this.showDataTable = false; // Assure que le tableau vide n'est pas montré

                }
            });
        }, 0);
    }

    /**
   * Mise en place d'un observateur qui détecte les changements de taille du conteneur.
   */
    private setupResizeObserver(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        const hostElement = this.chartHost.nativeElement;

        this.resizeObserver = new ResizeObserver(() => {
            // On utilise un "debounce" pour éviter de redessiner le graphique des dizaines de fois par seconde
            clearTimeout(this.resizeDebounceTimer);
            this.resizeDebounceTimer = setTimeout(() => {
                console.log('Conteneur redimensionné, recalcul des tailles...');
                this.redrawChart();
            }, 100); // Attend 100ms après le dernier événement de redimensionnement
        });

        this.resizeObserver.observe(hostElement);
    }


    /**
  *  Redessine le graphique avec les nouvelles dimensions.
  */
    private redrawChart(): void {
        if (!this.lastLoadedPreset || !this.lastLoadedChartData) {
            return;
        }
        // On reconstruit les options avec la nouvelle taille du conteneur
        this.chartOptions = this._buildChartOptionsFromPreset(this.lastLoadedPreset, this.lastLoadedChartData);

        if (!this.echartsInstance) { // On vérifie si l'instance existe
            return;
        }
        //  On remplace la reconstruction des options par un simple appel à resize()
        console.log('Conteneur redimensionné, appel de resize()...');
        this.echartsInstance.resize();
    }
    /**
     * Construit l'objet EChartsOption final en combinant un preset (style) et des données (contenu).
     
     */

    private categoryGroups: any[] = [];
    private legendCategories: any[] = [];



    private formatBarValue(value: number): string {
        const n = Number(value) || 0;
        const fixed = n.toFixed(2);
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    }


    private calculateFontSize(baseSize: number, maxSize: number): number {
        const containerWidth = this.chartHost?.nativeElement.clientWidth || 925;
        const baseWidth = 1100;
        const scalingFactor = Math.min(1, containerWidth / baseWidth);
        const newSize = Math.floor(baseSize * scalingFactor);
        return Math.max(10, Math.min(maxSize, newSize));
    }

    //  Construction du label des axes X et Y

    private buildAxesConfig(options: any, chartType: string, isDarkMode: boolean = false): any {
        const axesConfig: any = {};

        const axisLineColor = isDarkMode ? '#c7c7c7' : '#ccc';
        const splitLineColor = isDarkMode ? 'rgba(255,255,255,0.12)' : '#f0f0f0';

        if (chartType === 'bar' || chartType === 'bar_groupé') {
            axesConfig.xAxis = {
                type: 'category',
                show: options.xShow,
                axisLabel: {
                    rotate: options.xAxisRotate,
                    fontSize: this.calculateFontSize(options.xAxisLabelSize, 12),
                    color: options.xAxisLabelColor
                },
                //  Label de l'axe X
                name: options.xAxisLabel?.show ? options.xAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: options.xAxisLabel?.offset || 50,
                nameTextStyle: {
                    color: options.xAxisLabel?.color || '#333333',
                    fontSize: this.calculateFontSize(options.xAxisLabel?.fontSize || 14, 16),
                    fontWeight: options.xAxisLabel?.fontWeight || 'normal'
                },

                axisTick: {
                    show: options.xShow,
                    alignWithLabel: true
                },
                axisLine: {
                    show: options.xShow,
                    lineStyle: { color: axisLineColor }
                },
            };

            axesConfig.yAxis = {
                type: 'value',
                show: options.yShow,
                axisLabel: {
                    fontSize: this.calculateFontSize(options.yAxisLabelSize, 12),
                    color: options.yAxisLabelColor
                },
                // NOUVEAU : Label de l'axe Y
                name: options.yAxisLabel?.show ? options.yAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: options.yAxisLabel?.offset || 50,
                nameTextStyle: {
                    color: options.yAxisLabel?.color || '#333333',
                    fontSize: this.calculateFontSize(options.yAxisLabel?.fontSize || 14, 16),
                    fontWeight: options.yAxisLabel?.fontWeight || 'normal'
                },
                // Rotation pour le label Y si vertical
                ...(options.yAxisLabel?.vertical && {
                    nameRotate: 90
                }),
                splitLine: {
                    show: options.ySplitLineShow,
                    lineStyle: { color: '#f0f0f0' }
                },
                axisLine: {
                    show: options.yShow,
                    lineStyle: { color: '#ccc' }
                }
            };

        } else if (chartType === 'ligne') {
            axesConfig.xAxis = {
                type: 'category',
                boundaryGap: options.xBoundaryGap,
                show: options.xShow,
                axisLabel: {
                    rotate: options.xAxisRotate,
                    fontSize: this.calculateFontSize(options.xAxisLabelSize, 12),
                    color: options.xAxisLabelColor
                },
                //  Label de l'axe X pour ligne
                name: options.xAxisLabel?.show ? options.xAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: options.xAxisLabel?.offset || 50,
                nameTextStyle: {
                    color: options.xAxisLabel?.color || '#333333',
                    fontSize: this.calculateFontSize(options.xAxisLabel?.fontSize || 14, 16),
                    fontWeight: options.xAxisLabel?.fontWeight || 'normal'
                },
                axisLine: {
                    show: options.xShow,
                    lineStyle: { color: axisLineColor }
                },
                splitLine: {
                    show: options.xSplitLineShow,
                    lineStyle: { color: splitLineColor }
                },
                axisTick: {
                    show: options.xShow
                }
            };

            axesConfig.yAxis = {
                type: 'value',
                show: options.yShow,
                axisLabel: {
                    fontSize: this.calculateFontSize(options.yAxisLabelSize, 12),
                    color: options.yAxisLabelColor
                },
                // Label de l'axe Y pour ligne
                name: options.yAxisLabel?.show ? options.yAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: options.yAxisLabel?.offset || 50,
                nameTextStyle: {
                    color: options.yAxisLabel?.color || '#333333',
                    fontSize: this.calculateFontSize(options.yAxisLabel?.fontSize || 14, 16),
                    fontWeight: options.yAxisLabel?.fontWeight || 'normal'
                },
                // Rotation pour le label Y si vertical
                ...(options.yAxisLabel?.vertical && {
                    nameRotate: 90
                }),
                splitLine: {
                    show: options.ySplitLineShow,
                    lineStyle: { color: '#f0f0f0' }
                },
                axisLine: {
                    show: options.yShow,
                    lineStyle: { color: axisLineColor },
                    splitLine: {
                        show: options.ySplitLineShow,
                        lineStyle: { color: splitLineColor }
                    }

                }
            };
        }

        return axesConfig;
    }

    //  Helper pour diagramme en bar
    private getBarXAxisData(chartType: string): string[] {
        if (chartType === 'bar') {
            return this.lastLoadedChartData?.map((item: any) => item.name) || [];
        } else if (chartType === 'bar_groupé') {
            return this.lastLoadedChartData?.[0]?.slice(1) || [];
        }
        return [];
    }

    //  Helper pour diagramme en  ligne
    private getLineXAxisData(): string[] {
        return this.lastLoadedChartData?.x || [];
    }



    /**
 * Applique les motifs de décal aux séries
 */
    private applyDecalPattern(series: any[], useDecalPattern: boolean): any[] {
        if (!useDecalPattern) return series;

        return series.map((serie, index) => ({
            ...serie,
            itemStyle: {
                ...serie.itemStyle,
                decal: this.getDecalPattern(index)
            }
        }));
    }

    /**
     * Applique les motifs de décal aux données de camembert
     */
    private applyDecalPatternToPieData(pieData: any[], useDecalPattern: boolean): any[] {
        if (!useDecalPattern) return pieData;

        return pieData.map((item, index) => ({
            ...item,
            itemStyle: {
                ...item.itemStyle,
                decal: this.getDecalPattern(index)
            }
        }));
    }

    /**
     * Génère les motifs de décal (identique à ModalGraphicComponent)
     */
    private getDecalPattern(index: number): any {
        const i = index % 5;
        const common = { color: 'rgba(0,0,0,0.22)', symbolSize: 1 };

        switch (i) {
            case 0: return { ...common, symbol: 'rect', dashArrayX: [4, 2], dashArrayY: [2, 2], rotation: 0 };
            case 1: return { ...common, symbol: 'rect', dashArrayX: [1, 2], dashArrayY: [4, 2], rotation: Math.PI / 4 };
            case 2: return { ...common, symbol: 'line', dashArrayX: [1, 0], dashArrayY: [2, 3], rotation: 0 };
            case 3: return { ...common, symbol: 'rect', dashArrayX: [0, 4], dashArrayY: [2, 2], rotation: Math.PI / 6 };
            default: return { ...common, symbol: 'triangle', dashArrayX: [1, 2], dashArrayY: [2, 2], rotation: 0 };
        }
    }


    //méthode qui lit et interprète le contenu des JSON et construit le graphique

    private _buildChartOptionsFromPreset(preset: Preset, chartData: any): EChartsOption {
        // Extraction des options
        const { options, colorScheme = [], categoryGroups = [] } = preset.config;
        // const colorMap = new Map(colorScheme.map((item: any) => [item.name, item.color]));
        this.categoryGroups = categoryGroups;
        // Logique de redimensionnement de la police
        const containerWidth = this.chartHost?.nativeElement.clientWidth || 925;
        const baseWidth = 1100;
        const scalingFactor = Math.min(1, containerWidth / baseWidth);
        const calculateFontSize = (baseSize: number, maxSize: number) => {
            const newSize = Math.floor(baseSize * scalingFactor);
            return Math.max(10, Math.min(maxSize, newSize));
        };

        // Options globales avec valeurs par défaut
        const isDarkMode = options.isDarkMode || false;
        const useDecalPattern = options.useDecalPattern || false;

        const colorMap = new Map(colorScheme.map((item: any) => [item.name, item.color]));
        this.categoryGroups = categoryGroups;

        // Configuration du thème
        const backgroundColor = isDarkMode ? '#121212' : 'transparent';
        const textColor = isDarkMode ? '#e0e0e0' : '#333333';
        const axisLineColor = isDarkMode ? '#c7c7c7' : '#666666';
        const gridLineColor = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

        // Configuration de base avec thème
        const baseOptions: any = {
            backgroundColor: backgroundColor,
            textStyle: {
                color: textColor
            }
        };



        // Configuration du titre
        const titleConfig: any = {
            show: options.titleEnabled,
            text: options.titleText,
            subtext: options.subtitleText,
            left: `${options.titleOffsetX}%`,
            top: `${options.titleOffsetY}%`,
            textAlign: options.titleTextAlign,
            textVerticalAlign: options.titleTextVerticalAlign,
            itemGap: options.titleItemGap,
            textStyle: { color: options.titleColor, fontSize: calculateFontSize(options.titleFontSize, 25), fontWeight: options.titleFontWeight },
            subtextStyle: { color: options.subtitleColor, fontSize: calculateFontSize(options.subtitleFontSize, 14), fontWeight: options.subtitleFontWeight },
            backgroundColor: options.titleBoxEnabled ? options.titleBoxBg : 'transparent',
            borderColor: options.titleBoxBorderColor,
            borderWidth: options.titleBoxBorderWidth,
            borderRadius: options.titleBoxBorderRadius,
            padding: options.titleBoxPadding,
        };

        // Configuration de la légende
        const legendConfig: any = {
            show: options.legendShow,
            orient: options.legendOrient,
            type: options.legendType,
            itemWidth: options.legendItemWidth,
            itemHeight: options.legendItemHeight,
            itemGap: options.legendItemGap,
            icon: (options.legendIcon === 'auto' || !options.legendIcon) ? undefined : options.legendIcon,
            textStyle: { color: options.legendTextColor, fontSize: calculateFontSize(options.legendTextSize, 16), fontWeight: options.legendTextWeight },
            formatter: options.legendFormatter,
            selectedMode: options.legendSelectedMode
        };

        if (options.legendUseXY) {
            // Si la position X est supérieure à 50%, on considère que l'intention
            // de l'utilisateur est d'aligner la légende à droite.
            if (options.legendPosX > 50) {
                console.log("Alignement à droite détecté. Utilisation de la propriété 'right' pour la robustesse.");
                // On traduit la position X en marge depuis la droite.
                const rightMargin = 100 - options.legendPosX;
                legendConfig.right = `${rightMargin}%`;
            } else {
                // Sinon, on garde le comportement normal avec 'left'.
                legendConfig.left = `${options.legendPosX}%`;
            }

            // La position verticale ne change pas.
            legendConfig.top = `${options.legendPosY}%`;

        } else {
            legendConfig.left = options.legendLeft;
            legendConfig.top = options.legendTop;
        }

        // Configuration du tooltip
        const tooltipConfig: any = {
            show: options.tooltipEnabled,
            triggerOn: options.tooltipTriggerOn,
            backgroundColor: options.tooltipBg,
            borderColor: options.tooltipBorderColor,
            borderWidth: options.tooltipBorderWidth,
            padding: options.tooltipPadding,
            borderRadius: options.tooltipBorderRadius,
            textStyle: { color: options.tooltipTextColor, fontSize: options.tooltipFontSize, fontWeight: options.tooltipFontWeight }
        };

        // Préparation des variables pour la grille et le centre
        const isGridBased = ['bar', 'bar_groupé', 'ligne'].includes(preset.type);
        const isPie = preset.type === 'pie';

        let finalGrid = isGridBased ? {
            left: `${options.gridLeft}%`, right: `${options.gridRight}%`,
            top: `${options.gridTop}%`, bottom: `${options.gridBottom}%`,
            containLabel: options.gridContainLabel
        } : undefined;






        let finalCenter = isPie ? [`${options.centerX}%`, `${options.centerY}%`] : undefined;

        // configuration de datazoom

        const dataZoomConfig: any[] = [];
        if (isGridBased) {
            if (options.dataZoomInside) {
                dataZoomConfig.push({
                    type: 'inside',
                    xAxisIndex: [0],
                    start: options.dataZoomStart || 0,
                    end: options.dataZoomEnd || 100
                });
            }
            if (options.dataZoomSlider) {
                const sliderConfig: any = {
                    type: 'slider',
                    xAxisIndex: [0],
                    start: options.dataZoomStart || 0,
                    end: options.dataZoomEnd || 100
                };


                if (options.dzUseXY) {

                    if (options.dzPosUnit === '%') {
                        sliderConfig.left = `${options.dzOffsetX || 0}%`;
                        sliderConfig.top = `${options.dzOffsetY || 0}%`;
                        if (options.dzWidth != null) sliderConfig.width = `${options.dzWidth}%`;
                        if (options.dzHeight != null) sliderConfig.height = `${options.dzHeight}%`;
                    } else {
                        // Position en pixels
                        sliderConfig.left = options.dzOffsetX || 0;
                        sliderConfig.top = options.dzOffsetY || 0;
                        if (options.dzWidth != null) sliderConfig.width = options.dzWidth;
                        if (options.dzHeight != null) sliderConfig.height = options.dzHeight;
                    }
                } else {
                    // Position par défaut d'ECharts
                    sliderConfig.bottom = 10; // ou autre valeur par défaut
                }

                dataZoomConfig.push(sliderConfig);
            }
        }

        switch (preset.type) {

            case 'pie': {
                let finalData = chartData;
                if (categoryGroups.length > 0) {
                    const memberToGroup = new Map<string, any>();
                    categoryGroups.forEach((g: any) => g.members.forEach((m: string) => memberToGroup.set(m, g)));
                    const aggregatedData = new Map<string, number>();
                    for (const item of chartData) {
                        const group = memberToGroup.get(item.name);
                        const targetName = group ? group.name : item.name;
                        aggregatedData.set(targetName, (aggregatedData.get(targetName) || 0) + Number(item.value || 0));
                    }
                    finalData = Array.from(aggregatedData.entries()).map(([name, value]) => ({ name, value }));
                }
                const seriesData = finalData.map((dp: any) => ({
                    name: dp.name,
                    value: dp.value,
                    itemStyle: { color: colorMap.get(dp.name) }
                }));
                const valueMap = new Map<string, number>();
                let totalSum = 0;
                finalData.forEach((item: { name: string, value: number }) => {
                    const val = Number(item.value) || 0;
                    valueMap.set(item.name, val);
                    totalSum += val;
                });
                const formatNumber = (num: number) => num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });


                return {
                    ...baseOptions,
                    title: titleConfig,
                    legend: {
                        ...legendConfig,
                        data: seriesData.map((d: any) => d.name),
                        formatter: (name: string) => {
                            const tpl = options.legendFormatter || '{name}';
                            if (!tpl.includes('{value}') && !tpl.includes('{percent}')) {
                                return tpl.replace('{name}', name);
                            }
                            const value = valueMap.get(name) ?? 0;
                            const percent = totalSum > 0 ? (value / totalSum) * 100 : 0;
                            return tpl
                                .replace('{name}', name)
                                .replace('{value}', formatNumber(value))
                                .replace('{percent}', percent.toFixed(2));
                        }
                    },
                    tooltip: {
                        ...tooltipConfig, trigger: 'item', backgroundColor: isDarkMode ? 'rgba(50,50,50,0.9)' : options.tooltipBg, textStyle: {
                            color: isDarkMode ? '#e0e0e0' : options.tooltipTextColor
                        }
                    },
                    series: [{
                        type: 'pie',
                        data: this.applyDecalPatternToPieData(seriesData, useDecalPattern),
                        radius: options.isDonut ? [`${options.innerRadius}%`, `${options.outerRadius}%`] : `${options.outerRadius}%`,
                        center: finalCenter,
                        roseType: options.roseType,
                        avoidLabelOverlap: options.avoidLabelOverlap,
                        startAngle: options.startAngle,
                        clockwise: options.clockwise,
                        minAngle: options.minAngle,
                        padAngle: options.padAngle,
                        selectedMode: options.selectedMode,
                        selectedOffset: options.selectedOffset,
                        stillShowZeroSum: options.stillShowZeroSum,
                        label: {
                            show: options.labelShow,
                            position: options.labelPosition,
                            formatter: options.labelFormatter,
                            color: options.labelColor,
                            fontSize: calculateFontSize(options.labelFontSize, 16),
                            fontWeight: options.labelFontWeight,
                            backgroundColor: options.labelBackgroundColor,
                            padding: options.labelPadding,
                            borderRadius: options.labelBorderRadius,
                            textShadowColor: options.labelTextShadowColor,
                            textShadowBlur: options.labelTextShadowBlur,
                            align: options.labelPosition === 'inside' ? options.labelInsideAlign : undefined,
                            verticalAlign: options.labelPosition === 'inside' ? options.labelInsideVerticalAlign : undefined
                        },
                        labelLine: {
                            show: options.labelPosition === 'outside' ? options.labelLineShow : false,
                            length: options.labelLineLength,
                            length2: options.labelLineLength2
                        },
                        itemStyle: {
                            borderColor: options.itemBorderColor,
                            borderWidth: options.itemBorderWidth,
                            borderRadius: options.itemBorderRadius
                        },
                        emphasis: {
                            scale: options.hoverAnimation,
                            focus: options.emphasisFocus,
                            scaleSize: options.emphasisScaleSize,
                            itemStyle: {
                                shadowBlur: options.emphasisShadowBlur,
                                shadowColor: options.emphasisShadowColor
                            },
                            label: {
                                show: options.emphasisLabelShow,
                                fontSize: calculateFontSize(options.emphasisLabelFontSize, 20),
                                fontWeight: options.emphasisLabelFontWeight,
                            },
                            labelLine: {
                                show: options.labelPosition === 'outside' ? options.emphasisLabelLineShow : false
                            },
                        }

                    }]
                };
            }






            case 'bar': {
                // ÉTAPE 1 : AGRÉGATION des catégories
                let finalData = chartData;
                if (categoryGroups && categoryGroups.length > 0) {
                    const memberToGroup = new Map<string, any>();
                    categoryGroups.forEach((g: any) => g.members.forEach((m: string) => memberToGroup.set(m, g)));
                    const aggregatedData = new Map<string, number>();
                    for (const item of chartData) {
                        const group = memberToGroup.get(item.name);
                        const targetName = group ? group.name : item.name;
                        aggregatedData.set(targetName, (aggregatedData.get(targetName) || 0) + Number(item.value || 0));
                    }
                    finalData = Array.from(aggregatedData.entries()).map(([name, value]) => ({ name, value }));
                }

                // ÉTAPE 2 : GARDER L'ORDRE ORIGINAL
                const categoryNames = finalData.map((item: any) => item.name);
                const values = finalData.map((item: any) => Number(item.value) || 0);

                // ÉTAPE 3 : CRÉATION DES SÉRIES MULTIPLES AVEC EMPILEMENT POUR L'ALIGNEMENT
                const series = categoryNames.map((name: string, index: number) => {
                    // Créer un tableau de données où seule la barre correspondante a une valeur
                    const data = new Array(categoryNames.length).fill(0);
                    data[index] = values[index]; // Mettre la valeur à la position correcte

                    return {
                        name: name,
                        type: 'bar',
                        data: data,
                        stack: 'total', // Empilement pour que les barres soient côte à côte
                        itemStyle: {
                            color: colorMap.get(name),
                            borderColor: options.itemBorderColor,
                            borderWidth: options.itemBorderWidth,
                            borderRadius: options.barBorderRadius || 0
                        },
                        barWidth: options.barWidthPx > 0 ? options.barWidthPx : undefined,
                        label: {
                            show: options.labelShow && values[index] > 0, // Afficher seulement si valeur > 0
                            position: options.labelPosition,
                            formatter: (params: any) => {
                                const value = params.value as number;
                                if (value === 0) return '';
                                const tpl = options.labelFormatter || '{c}';
                                let formatted = tpl.replace('{c}', this.formatBarValue(value));
                                formatted = formatted.replace('{b}', name);
                                return formatted;
                            },
                            color: options.labelColor,
                            fontSize: calculateFontSize(options.labelFontSize, 16),
                            fontWeight: options.labelFontWeight
                        },
                        emphasis: {
                            focus: 'series',
                            itemStyle: {
                                shadowBlur: options.emphasisShadowBlur,
                                shadowColor: options.emphasisShadowColor
                            }
                        }
                    };
                });

                //  FORMATTER POUR LA LÉGENDE
                const customLegendFormatter = (name: string): string => {
                    if (options.legendFormatter && options.legendFormatter.includes('{value}')) {
                        const dataItem = finalData.find((item: any) => item.name === name);
                        const value = dataItem ? dataItem.value : 0;
                        const formattedValue = this.formatBarValue(value);
                        return options.legendFormatter
                            .replace(/{name}/g, name)
                            .replace(/{value}/g, formattedValue);
                    }
                    return name;
                };


                //Configuration des axes
                const axesConfig = this.buildAxesConfig(options, 'bar');
                axesConfig.xAxis.data = categoryNames; // Injecter les données

                // Appliquer le thème aux axes
                axesConfig.xAxis.axisLine.lineStyle.color = axisLineColor;
                axesConfig.yAxis.axisLine.lineStyle.color = axisLineColor;
                axesConfig.yAxis.splitLine.lineStyle.color = gridLineColor;
                // CORRECTION : Appliquer le thème aux textes des axes
                axesConfig.xAxis.axisLabel.color = textColor;
                axesConfig.yAxis.axisLabel.color = textColor;

                //  CONFIGURATION FINALE
                return {
                    ...baseOptions,
                    title: titleConfig,
                    legend: {
                        ...legendConfig,
                        data: categoryNames,
                        formatter: customLegendFormatter,
                        textStyle: {
                            ...legendConfig.textStyle,
                            color: textColor // application de la couleur du thème
                        }
                    },
                    tooltip: {
                        ...tooltipConfig,
                        trigger: 'item',
                        formatter: (params: any) => {
                            const value = params.value as number;
                            if (value === 0) return '';
                            return `${params.marker} ${params.seriesName}: ${this.formatBarValue(value)}`;
                        }
                    },
                    grid: finalGrid,

                    xAxis: axesConfig.xAxis,
                    yAxis: axesConfig.yAxis,
                    dataZoom: dataZoomConfig,
                    // series: series

                    series: this.applyDecalPattern(series, useDecalPattern)
                } as EChartsOption;
            }








            case 'bar_groupé': {
                const dimensions = chartData[0];
                const source = chartData;
                const seriesNames = source.slice(1).map((row: any) => row[0]);

                // ÉTAPE 1 : APPLIQUER L'AGRÉGATION PAR GROUPES DE CATÉGORIES
                const memberToGroup = new Map<string, string>();
                this.categoryGroups.forEach((g: any) => g.members.forEach((m: string) => memberToGroup.set(m, g.name)));

                // Agrégation des séries
                const aggregatedSeriesMap = new Map<string, number[]>();

                source.slice(1).forEach((row: any[]) => {
                    const originalSeriesName = row[0];
                    const targetSeriesName = memberToGroup.get(originalSeriesName) || originalSeriesName;
                    const values = row.slice(1).map(val => Number(val) || 0);

                    if (!aggregatedSeriesMap.has(targetSeriesName)) {
                        // Initialiser avec des zéros si nouvelle série
                        aggregatedSeriesMap.set(targetSeriesName, new Array(values.length).fill(0));
                    }

                    // Additionner les valeurs
                    const currentValues = aggregatedSeriesMap.get(targetSeriesName)!;
                    values.forEach((val, index) => {
                        currentValues[index] += val;
                    });
                });

                // ÉTAPE 2 : FILTRER SELON LA VISIBILITÉ DANS LA LÉGENDE
                const visibleSeriesNames = Array.from(aggregatedSeriesMap.keys()).filter(seriesName => {
                    const legendItem = this.legendCategories.find(cat => cat.name === seriesName);
                    return legendItem ? legendItem.visible : true; // Par défaut visible si pas dans la légende
                });

                // ÉTAPE 3 : CRÉER LES SÉRIES AVEC DONNÉES AGRÉGÉES
                const series = visibleSeriesNames.map((seriesName, index) => {
                    const values = aggregatedSeriesMap.get(seriesName) || [];



                    return {
                        name: seriesName,
                        type: 'bar',
                        data: values,
                        itemStyle: {
                            color: colorMap.get(seriesName),
                            borderRadius: options.barBorderRadius || 0
                        },
                        barGap: options.barGap,
                        barCategoryGap: options.barCategoryGap,
                        label: {
                            show: options.labelShow,
                            position: options.labelPosition,
                            formatter: (params: any) => {
                                const value = params.value as number;
                                if (value === 0) return '';
                                const tpl = options.labelFormatter || '{c}';
                                let formatted = tpl.replace('{c}', this.formatBarValue(value));
                                formatted = formatted.replace('{b}', params.seriesName || '');
                                return formatted;
                            },
                            color: options.labelColor,
                            fontSize: calculateFontSize(options.labelFontSize, 16),
                            fontWeight: options.labelFontWeight
                        },
                        emphasis: {
                            focus: 'series',
                            itemStyle: {
                                shadowBlur: options.emphasisShadowBlur,
                                shadowColor: options.emphasisShadowColor
                            },
                            label: {
                                show: options.emphasisLabelShow
                            }
                        },
                        animation: options.animation,
                        animationDuration: options.animationDuration,
                        animationEasing: options.animationEasing
                    };
                });

                //  FORMATTER POUR LA LÉGENDE AVEC VALEURS AGRÉGÉES
                const customLegendFormatter = (name: string): string => {
                    if (options.legendFormatter && options.legendFormatter.includes('{value}')) {
                        const seriesData = aggregatedSeriesMap.get(name);
                        const total = seriesData ? seriesData.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                        const formattedValue = this.formatBarValue(total);
                        return options.legendFormatter
                            .replace(/{name}/g, name)
                            .replace(/{value}/g, formattedValue);
                    }
                    return name;
                };




                const header = dimensions.slice(1);
                // configuration des axes
                const axesConfig = this.buildAxesConfig(options, 'bar_groupé');
                axesConfig.xAxis.data = header; // Injecter les données

                // Appliquer le thème
                axesConfig.xAxis.axisLine.lineStyle.color = axisLineColor;
                axesConfig.yAxis.axisLine.lineStyle.color = axisLineColor;
                axesConfig.yAxis.splitLine.lineStyle.color = gridLineColor;

                // CORRECTION : Appliquer le thème aux textes des axes
                axesConfig.xAxis.axisLabel.color = textColor;
                axesConfig.yAxis.axisLabel.color = textColor;

                return {
                    ...baseOptions,
                    title: titleConfig,
                    legend: {
                        ...legendConfig,
                        data: visibleSeriesNames,
                        formatter: customLegendFormatter
                    },
                    tooltip: {
                        ...tooltipConfig,
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: (params: any) => {
                            const axisValue = params[0].axisValue;
                            let result = `${axisValue}<br/>`;
                            params.forEach((param: any) => {
                                const value = param.value as number;
                                if (value !== 0) { // Ne pas afficher les valeurs nulles
                                    result += `${param.marker} ${param.seriesName}: ${this.formatBarValue(value)}<br/>`;
                                }
                            });
                            return result;
                        }
                    },
                    grid: finalGrid,


                    xAxis: axesConfig.xAxis,
                    yAxis: axesConfig.yAxis,
                    dataZoom: dataZoomConfig,
                    // series: series
                    series: this.applyDecalPattern(series, useDecalPattern) // ← APPLIQUER PATTERNS
                } as EChartsOption;
            }




            case 'ligne': {
                // ÉTAPE 1 : AGRÉGATION IDENTIQUE À LA MODALE
                let finalChartData = chartData;

                const categoryGroups = preset.config.categoryGroups || [];
                console.log('🔍 CategoryGroups pour agrégation:', categoryGroups);
                console.log('🔍 Données brutes reçues:', chartData);

                // Appliquer l'agrégation SI on a des groupes (comme dans la modale)
                if (categoryGroups.length > 0) {
                    console.log('🔄 Début de l\'agrégation côté client (comme dans la modale)');

                    // Même logique que ModalGraphicComponent
                    const memberToGroup = new Map<string, string>();
                    categoryGroups.forEach((group: any) => {
                        group.members.forEach((member: string) => {
                            memberToGroup.set(member, group.name);
                        });
                    });

                    // Agrégation des séries (comme pour pie/bar dans la modale)
                    const aggregatedSeriesMap = new Map<string, number[]>();

                    // Initialiser les groupes avec des tableaux de zéros
                    chartData.series.forEach((serie: any) => {
                        const targetName = memberToGroup.get(serie.name) || serie.name;
                        if (!aggregatedSeriesMap.has(targetName)) {
                            aggregatedSeriesMap.set(targetName, new Array(chartData.x.length).fill(0));
                        }
                    });

                    // Additionner les données (comme dans la modale)
                    chartData.series.forEach((serie: any) => {
                        const targetName = memberToGroup.get(serie.name) || serie.name;
                        const aggregatedData = aggregatedSeriesMap.get(targetName);

                        if (aggregatedData && serie.data) {
                            serie.data.forEach((value: number, index: number) => {
                                aggregatedData[index] += Number(value) || 0;
                            });
                            console.log(`➕ Série "${serie.name}" → "${targetName}"`);
                        }
                    });

                    // Convertir en format final
                    const aggregatedSeries = Array.from(aggregatedSeriesMap.entries()).map(([name, data]) => ({
                        name,
                        data: data.map(val => Math.round((val + Number.EPSILON) * 100) / 100)
                    }));

                    console.log('✅ Séries après agrégation:', aggregatedSeries);

                    finalChartData = {
                        x: chartData.x,
                        series: aggregatedSeries
                    };
                } else {
                    console.log('ℹ️ Aucun groupe à agréger');
                }



                const seriesData = finalChartData.series.map((serie: any) => {
                    const seriesConfig: any = {
                        name: serie.name,
                        data: serie.data,
                        type: 'line',
                        stack: options.stack || undefined,
                        smooth: options.smooth || false,
                        symbol: options.symbol || 'emptyCircle',
                        symbolSize: options.symbolSize || 6,
                        showSymbol: options.showSymbol !== false, // true par défaut
                        connectNulls: options.connectNulls || false,
                        step: options.step || false,
                        lineStyle: {
                            width: options.lineWidth || 2,
                            type: options.lineType || 'solid'
                        },
                        itemStyle: {
                            color: colorMap.get(serie.name) || '#5470c6'
                        }
                    };

                    // CONFIGURATION DES LABELS - CORRECTION IMPORTANTE
                    if (options.labelShow) {
                        seriesConfig.label = {
                            show: true,
                            position: options.labelPosition || 'top',
                            formatter: (params: any) => {
                                const value = params.value as number;
                                if (value === 0) return '';
                                const tpl = options.labelFormatter || '{c}';
                                let formatted = tpl.replace('{c}', this.formatBarValue(value));
                                formatted = formatted.replace('{b}', params.seriesName || '');
                                return formatted;
                            },
                            color: options.labelColor || '#666666',
                            fontSize: this.calculateFontSize(options.labelFontSize || 11, 16),
                            fontWeight: options.labelFontWeight || 'normal'
                        };
                    } else {
                        // Désactiver explicitement les labels
                        seriesConfig.label = { show: false };
                    }

                    // AREA STYLE (si activé)
                    if (options.areaOpacity > 0) {
                        seriesConfig.areaStyle = {
                            opacity: options.areaOpacity
                        };
                    }

                    // EMPHASIS
                    seriesConfig.emphasis = {
                        focus: options.emphasisFocus || 'series',
                        itemStyle: {
                            shadowBlur: options.emphasisShadowBlur || 6,
                            shadowColor: options.emphasisShadowColor || 'rgba(0,0,0,0.3)'
                        },
                        label: {
                            show: options.emphasisLabelShow || false
                        }
                    };

                    // ANIMATION
                    if (options.animation !== false) {
                        seriesConfig.animation = true;
                        seriesConfig.animationDuration = options.animationDuration || 500;
                        seriesConfig.animationEasing = options.animationEasing || 'cubicOut';
                    }

                    return seriesConfig;
                });


                const axesConfig = this.buildAxesConfig(options, 'ligne');
                axesConfig.xAxis.data = finalChartData.x; // Injecter les données
                axesConfig.xAxis.boundaryGap = options.xBoundaryGap;

                // Appliquer le thème
                axesConfig.xAxis.axisLine.lineStyle.color = axisLineColor;
                axesConfig.yAxis.axisLine.lineStyle.color = axisLineColor;
                axesConfig.yAxis.splitLine.lineStyle.color = gridLineColor;

                // CORRECTION : Appliquer le thème aux textes des axes
                axesConfig.xAxis.axisLabel.color = textColor;
                axesConfig.yAxis.axisLabel.color = textColor;

                // ÉTAPE 4 : CONFIGURATION FINALE COMPLÈTE
                return {
                    ...baseOptions,
                    title: titleConfig,
                    legend: {
                        ...legendConfig,
                        data: finalChartData.series.map((s: any) => s.name),
                        formatter: (name: string) => {
                            const tpl = options.legendFormatter || '{name}';
                            return tpl.replace('{name}', name);
                        }
                    },
                    tooltip: {
                        ...tooltipConfig,
                        trigger: 'axis',
                        axisPointer: { type: 'line' },
                        icon: options.legendIcon === 'auto' ? undefined : options.legendIcon,
                        formatter: (params: any) => {
                            const arr = Array.isArray(params) ? params : [params];
                            const head = arr[0]?.axisValueLabel || arr[0]?.name || '';

                            const lines = arr.map((p: any) => {
                                const value = Number(p.value ?? 0);
                                return `${p.marker} ${p.seriesName}: ${this.formatBarValue(value)}`;
                            });

                            return `${head}<br/>${lines.join('<br/>')}`;
                        }
                    },
                    grid: finalGrid,
                    xAxis: axesConfig.xAxis,
                    yAxis: axesConfig.yAxis,
                    dataZoom: dataZoomConfig,
                    series: seriesData,

                    animation: options.animation,
                    animationDuration: options.animationDuration,
                    animationEasing: options.animationEasing,
                    data: this.applyDecalPatternToPieData(seriesData, useDecalPattern) // ← APPLIQUER PATTERNS
                } as EChartsOption;
            }

            default:
                return { title: { text: "Type de graphique non encore implémenté." } };
        }
    }


    // supprimer un diagramme predefini coté users

    deletePreset(presetId: string, event: MouseEvent): void {
        // Empêche le clic de déclencher d'autres événements (comme le chargement)
        event.stopPropagation();

        // Demande de confirmation
        // if (!confirm(`Êtes-vous sûr de vouloir supprimer ce graphique ?\n(ID: ${presetId})`)) {
        //     return;
        // }

        // console.log(`[GraphicComponent] Demande de suppression pour le preset ID: ${presetId}`);

        // Appel au service API (en supposant que la méthode existe)
        this.presetApiService.deletePreset(presetId).subscribe({
            next: () => {
                console.log('[GraphicComponent] Preset supprimé avec succès.');

                // Si le graphique supprimé est celui qui est actuellement affiché,
                // on retourne à la vue de la bibliothèque.
                if (this.lastLoadedPreset?.id === presetId) {
                    this.showGrid();
                }

                // Dans tous les cas, on rafraîchit la liste des presets.
                this.loadPresetLists();
            },
            error: (err) => {
                console.error('[GraphicComponent] Erreur lors de la suppression du preset:', err);
                // Idéalement, afficher un message d'erreur à l'utilisateur ici (ex: via un Snackbar)
                alert('Erreur: Impossible de supprimer le graphique.');
            }
        });
    }

    /**
         * DEBUT DE LA LOGIQUE SUNBURST
         */

    // loadSunburst(): void {
    //     console.log('🌊 Chargement du Sunburst - Milieux Humides');

    //     this.activeChartTitle = 'Sunburst - Milieux Humides';
    //     this.currentView = 'chart';
    //     this.chartOptions = null;

    //     this.apiService.getSunburstMilieuxHumides().subscribe({
    //         next: (rawData: any) => {
    //             console.log('🌊 DONNÉES BRUTES:', rawData);

    //             // Conversion IMMÉDIATE des valeurs string → number
    //             const convertedData = rawData.map((classe: any) => ({
    //                 name: classe.name,
    //                 value: 0, // Sera calculé
    //                 children: (classe.children || []).map((enfant: any) => ({
    //                     name: enfant.name,
    //                     value: Number(enfant.value) || 0 // ← CONVERSION DIRECTE
    //                 }))
    //             }));

    //             // Calculer les valeurs totales des parents
    //             convertedData.forEach((classe: any) => {
    //                 classe.value = classe.children.reduce((sum: number, child: any) => sum + child.value, 0);
    //             });

    //             console.log('🌊 DONNÉES CONVERTIES:', convertedData);

    //             this.chartOptions = this._buildSunburstOptions(convertedData);
    //             this.setupResizeObserver();

    //             if (this.echartsInstance) {
    //                 setTimeout(() => this.echartsInstance.resize(), 0);
    //             }
    //         },
    //         error: (err) => {
    //             console.error('❌ Erreur:', err);
    //             this.activeChartTitle = "Erreur de chargement";
    //         }
    //     });
    // }


    // private _cleanSunburstData(rawData: any[]): any[] {
    //     console.log('🔧 Nettoyage des données Sunburst - Format original:', rawData);

    //     if (!Array.isArray(rawData)) {
    //         console.error('❌ Données Sunburst non valides');
    //         return [];
    //     }

    //     const cleanedData = rawData.map((classe: any) => {
    //         // Convertir les enfants avec valeurs string → number
    //         const children = (classe.children || []).map((enfant: any) => {
    //             // CONVERSION CRITIQUE: string → number
    //             const valeur = parseInt(enfant.value) || 0;
    //             console.log(`🔧 Conversion: "${enfant.value}" (${typeof enfant.value}) → ${valeur} (${typeof valeur})`);

    //             return {
    //                 name: enfant.name,
    //                 value: valeur
    //             };
    //         });

    //         // Calculer la valeur totale (somme des enfants)
    //         const totalValue = children.reduce((sum: number, child: any) => sum + child.value, 0);

    //         return {
    //             name: classe.name,
    //             value: totalValue, // ECharts a besoin d'une valeur au niveau parent aussi
    //             children: children
    //         };
    //     });

    //     console.log('🔧 Données nettoyées:', cleanedData);
    //     return cleanedData;
    // }


    // private _buildSunburstOptions(sunburstData: any[]): EChartsOption {
    //     console.log('🎨 Construction Sunburst avec:', sunburstData);

    //     return {
    //         title: {
    //             text: 'RÉPARTITION DES MILIEUX HUMIDES',
    //             subtext: `Total: ${sunburstData.reduce((sum, item) => sum + item.value, 0).toLocaleString()} occurrences`,
    //             left: 'center',
    //             textStyle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }
    //         },
    //         tooltip: {
    //             trigger: 'item',
    //             formatter: (params: any) => {
    //                 return `${params.name}<br/>Occurrences: ${params.value?.toLocaleString()}`;
    //             }
    //         },
    //         series: [{
    //             type: 'sunburst',
    //             data: sunburstData,
    //             radius: ['15%', '85%'],
    //             label: {
    //                 show: true,
    //                 rotate: 'radial',
    //                 minAngle: 10
    //             },
    //             emphasis: {
    //                 focus: 'ancestor'
    //             },
    //             levels: [
    //                 { // Niveau racine
    //                     r0: '0%',
    //                     r: '15%',
    //                     itemStyle: { borderWidth: 2 }
    //                 },
    //                 { // Niveau classes
    //                     r0: '15%',
    //                     r: '35%',
    //                     label: { rotate: 'radial' }
    //                 },
    //                 { // Niveau pressions
    //                     r0: '35%',
    //                     r: '85%',
    //                     label: { rotate: 'tangential', align: 'right' }
    //                 }
    //             ],
    //             itemStyle: {
    //                 borderColor: '#fff',
    //                 borderWidth: 1
    //             }
    //         }]
    //     };
    // }


    /**
         * FIN DE LA LOGIQUE SUNBURST
         */


    // Ouverture de la modale pour personnalisation
    customizeChart(): void {
        this.dialog.open(ModalGraphicComponent, { width: '1200px', height: '80vh' });
    }


    /**
     * Export du graphique en SVG
     */

    // DANS graphic.component.ts

    /**
     * Exporte le graphique affiché au format SVG,
     * en le rendant responsive, centré, et avec une couleur de fond.
     */
    exportChart(): void {


        if (!this.echartsInstance) {
            console.error("L'instance ECharts n'est pas disponible pour l'export.");
            return;
        }

        const originalSvgString = this.echartsInstance.renderToSVGString();

        // On rend le SVG responsive en remplaçant les dimensions fixes
        const responsiveSvgString = originalSvgString
            .replace(/width="(\d+)"/, 'width="100%"')
            .replace(/height="(\d+)"/, 'height="100%"');



        const backgroundColor = '#f0f2f5';


        const finalSvgString = responsiveSvgString.replace(
            />/,
            `>\n<rect x="0" y="0" width="100%" height="100%" fill="${backgroundColor}" />\n`
        );


        // On crée le Blob à partir de la chaîne finale (avec le fond)
        const blob = new Blob([finalSvgString], {
            type: 'image/svg+xml;charset=utf-8'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const fileName = this.activeChartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${fileName || 'graphique'}.svg`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Appliquer un filtre spatial sur les données




    filterToSelection(): void {
        if (!this.lastLoadedPreset) {
            console.warn("Aucun graphique n'est chargé. Impossible de filtrer.");
            return;
        }

        console.log(`Activation du filtre spatial pour le preset: ${this.lastLoadedPreset.id}`);
        this.useSpatialFilter = true; // 1. Active le flag
        this.loadPreset(this.lastLoadedPreset.id);
    }



    //Affichage du tableau des données agrégées
    toggleDataTable(): void {
        this.showDataTable = !this.showDataTable;
        console.log('Affichage du tableau de données:', this.showDataTable);
    }





}