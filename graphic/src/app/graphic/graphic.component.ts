import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
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
        DragDropModule, MatDialogModule, NgxEchartsModule
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

    @ViewChild('chartHost') chartHost!: ElementRef<HTMLDivElement>;
    private resizeObserver?: ResizeObserver;
    private lastLoadedPreset: Preset | null = null;
    private lastLoadedChartData: any = null;
    private resizeDebounceTimer: any;

    //   Propriété pour stocker l'instance ECharts
    private echartsInstance: any;

    // Stocke la liste des presets appartenant à l'administrateur ou à un users.
    adminPresets: Preset[] = [];
    userPresets: Preset[] = [];

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

        // Étape 1: Récupérer le preset dans la BD (la configuration JSON).


        setTimeout(() => {
            this.presetApiService.getPreset(presetId).pipe(
                switchMap((preset: Preset) => {
                    const config = preset.config;
                    if (config.tables && !config.tableNames) {
                        config.tableNames = config.tables;
                        delete config.tables;
                    }

                    let dataRequest$: Observable<any>;
                    switch (preset.type) {
                        case 'pie': case 'bar':
                            dataRequest$ = this.apiService.getPieChartData(config);
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
                //  CORRECTION : On reçoit un objet 'result' et on accède à ses propriétés.
                // On ne déstructure plus directement car cela causait l'erreur.
                next: (result: PresetWithData) => {

                    //  MODIFICATION : On stocke les données pour pouvoir les réutiliser
                    this.lastLoadedPreset = result.preset;
                    this.lastLoadedChartData = result.chartData;

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
        // 👇 MODIFICATION : On remplace la reconstruction des options par un simple appel à resize()
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

    private _buildChartOptionsFromPreset(preset: Preset, chartData: any): EChartsOption {
        // Extraction des options
        const { options, colorScheme = [], categoryGroups = [] } = preset.config;
        const colorMap = new Map(colorScheme.map((item: any) => [item.name, item.color]));
        this.categoryGroups = categoryGroups;
        // Logique de redimensionnement de la police
        const containerWidth = this.chartHost?.nativeElement.clientWidth || 925;
        const baseWidth = 1100;
        const scalingFactor = Math.min(1, containerWidth / baseWidth);
        const calculateFontSize = (baseSize: number, maxSize: number) => {
            const newSize = Math.floor(baseSize * scalingFactor);
            return Math.max(10, Math.min(maxSize, newSize));
        };
        //Dark mode
        const backgroundColor = options.isDarkMode ? '#121212' : '#ffffff';

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
            icon: options.legendIcon,
            textStyle: { color: options.legendTextColor, fontSize: calculateFontSize(options.legendTextSize, 16), fontWeight: options.legendTextWeight },
            formatter: options.legendFormatter,
            selectedMode: options.legendSelectedMode
        };
        // if (options.legendUseXY) {
        //     legendConfig.left = `${options.legendPosX}%`;
        //     legendConfig.top = `${options.legendPosY}%`;
        // } else {
        //     legendConfig.left = options.legendLeft;
        //     legendConfig.top = options.legendTop;

        // }
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

        //Construction de la configuration DataZoom
        const dataZoomConfig: any[] = [];
        if (isGridBased) {
            if (options.dataZoomInside) {
                dataZoomConfig.push({
                    type: 'inside',
                    start: options.dataZoomStart,
                    end: options.dataZoomEnd
                });
            }
            if (options.dataZoomSlider) {
                const sliderConfig: any = {
                    type: 'slider',
                    start: options.dataZoomStart,
                    end: options.dataZoomEnd
                };
                if (options.dzUseXY) {
                    sliderConfig.left = options.dzPosUnit === '%' ? `${options.dzOffsetX}%` : options.dzOffsetX;
                    sliderConfig.top = options.dzPosUnit === '%' ? `${options.dzOffsetY}%` : options.dzOffsetY;
                    if (options.dzWidth != null) sliderConfig.width = options.dzPosUnit === '%' ? `${options.dzWidth}%` : options.dzWidth;
                    if (options.dzHeight != null) sliderConfig.height = options.dzPosUnit === '%' ? `${options.dzHeight}%` : options.dzHeight;
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
                    tooltip: { ...tooltipConfig, trigger: 'item' },
                    series: [{
                        type: 'pie',
                        data: seriesData,
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
                            }
                        }
                    }]
                };
            }






            case 'bar': {
                // ÉTAPE 1 : AGRÉGATION (si nécessaire)
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
                            borderRadius: options.itemBorderRadius
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

                // ÉTAPE 4 : FORMATTER POUR LA LÉGENDE
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

                // ÉTAPE 5 : CONFIGURATION FINALE
                return {
                    title: titleConfig,
                    legend: {
                        ...legendConfig,
                        data: categoryNames,
                        formatter: customLegendFormatter
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
                    xAxis: {
                        type: 'category',
                        data: categoryNames, // Les catégories dans l'ordre correct
                        axisLabel: {
                            rotate: options.xAxisRotate,
                            fontSize: calculateFontSize(options.xAxisLabelSize, 12),
                            color: options.xAxisLabelColor
                        }
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: { show: options.ySplitLineShow }
                    },
                    dataZoom: dataZoomConfig,
                    series: series
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
                            borderRadius: options.barBorderRadius
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

                // ÉTAPE 4 : FORMATTER POUR LA LÉGENDE AVEC VALEURS AGRÉGÉES
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

                // ÉTAPE 5 : CONFIGURATION FINALE
                const header = dimensions.slice(1); // Les groupes sur l'axe X

                return {
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
                    xAxis: {
                        type: 'category',
                        data: header,
                        axisLabel: {
                            rotate: options.xAxisRotate,
                            fontSize: calculateFontSize(options.xAxisLabelSize, 12),
                            color: options.xAxisLabelColor
                        }
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: { show: options.ySplitLineShow }
                    },
                    dataZoom: dataZoomConfig,
                    series: series
                } as EChartsOption;
            }


            // case 'ligne': {
            //     const seriesData = chartData.series.map((s: any) => ({
            //         name: s.name,
            //         data: s.data,
            //         type: 'line',
            //         stack: options.stack || null,
            //         smooth: options.smooth,
            //         symbol: options.symbol,
            //         symbolSize: options.symbolSize,
            //         showSymbol: options.showSymbol,
            //         lineStyle: { width: options.lineWidth, type: options.lineType },
            //         areaStyle: { opacity: options.areaOpacity },
            //         itemStyle: { color: colorMap.get(s.name) },
            //     }));
            //     return {
            //         title: titleConfig,
            //         legend: { ...legendConfig, data: chartData.series.map((s: any) => s.name) },
            //         tooltip: { ...tooltipConfig, trigger: 'axis' },
            //         grid: finalGrid,
            //         xAxis: { type: 'category', data: chartData.x, axisLabel: { rotate: options.xAxisRotate } },
            //         yAxis: { type: 'value', splitLine: { show: options.ySplitLineShow } },
            //         series: seriesData
            //     };
            // }


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

                const seriesData = finalChartData.series.map((serie: any) => ({
                    name: serie.name,
                    data: serie.data,
                    type: 'line',
                    stack: options.stack || undefined,
                    smooth: options.smooth,
                    symbol: options.symbol,
                    symbolSize: options.symbolSize,
                    showSymbol: options.showSymbol,
                    connectNulls: options.connectNulls,
                    step: options.step,
                    lineStyle: {
                        width: options.lineWidth,
                        type: options.lineType
                    },
                    areaStyle: options.areaOpacity > 0 ? {
                        opacity: options.areaOpacity
                    } : undefined,
                    itemStyle: {
                        color: colorMap.get(serie.name) || '#5470c6'
                    },
                    // AJOUTER TOUTES LES OPTIONS DE LABEL
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
                    // AJOUTER TOUTES LES OPTIONS D'EMPHASIS
                    emphasis: {
                        focus: options.emphasisFocus,
                        itemStyle: {
                            shadowBlur: options.emphasisShadowBlur,
                            shadowColor: options.emphasisShadowColor
                        },
                        label: {
                            show: options.emphasisLabelShow
                        }
                    },
                    // AJOUTER LES OPTIONS D'ANIMATION
                    animation: options.animation,
                    animationDuration: options.animationDuration,
                    animationEasing: options.animationEasing
                }));

                // ÉTAPE 3 : CONFIGURATION COMPLÈTE DES AXES
                const xAxisConfig = {
                    type: 'category' as const,
                    data: finalChartData.x,
                    boundaryGap: options.xBoundaryGap,
                    show: options.xShow,
                    axisLabel: {
                        rotate: options.xAxisRotate,
                        fontSize: calculateFontSize(options.xAxisLabelSize, 12),
                        color: options.xAxisLabelColor
                    },
                    axisLine: {
                        show: options.xShow,
                        lineStyle: { color: '#ccc' }
                    },
                    axisTick: {
                        show: options.xShow
                    }
                };

                const yAxisConfig = {
                    type: 'value' as const,
                    show: options.yShow,
                    splitLine: {
                        show: options.ySplitLineShow,
                        lineStyle: { color: '#f0f0f0' }
                    },
                    axisLabel: {
                        fontSize: calculateFontSize(options.yAxisLabelSize, 12),
                        color: options.yAxisLabelColor
                    },
                    axisLine: {
                        show: options.yShow,
                        lineStyle: { color: '#ccc' }
                    }
                };

                // ÉTAPE 4 : CONFIGURATION FINALE COMPLÈTE
                return {
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
                    xAxis: xAxisConfig,
                    yAxis: yAxisConfig,
                    dataZoom: dataZoomConfig,
                    series: seriesData,
                    // AJOUTER LA CONFIGURATION D'ANIMATION GLOBALE
                    animation: options.animation,
                    animationDuration: options.animationDuration,
                    animationEasing: options.animationEasing
                } as EChartsOption;
            }

            default:
                return { title: { text: "Type de graphique non encore implémenté." } };
        }
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


    filterToSelection(): void { }









}



