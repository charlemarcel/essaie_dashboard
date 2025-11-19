import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { LayerService, Layer } from '../services/layer.service';
import { ApiService, ColumnInfo, BarGroupedChartConfig, PieChartConfig, LineChartConfig, LineChartResponse } from '../api.service';
import { Observable, BehaviorSubject, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { EChartsOption, SeriesOption, TooltipComponentOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import type { ECharts } from 'echarts/core';
import { NgxColorsModule } from 'ngx-colors';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { GraphicPrefineServiceApi, CreatePresetDto, PresetType, Preset } from '../graphic.prefine.service.api';

import { RegisterPresetDialog } from '../graphic/register-preset.dialog';





// ====================================================================
// SECTION : INTERFACES
// ====================================================================

// Interface pour une catégorie de la légende
export interface LegendCategory {
    name: string;
    color: string;
    visible: boolean;
}

// Interface UI pour configurer le camembert/donut
type PieRoseType = false | 'radius' | 'area';
type PieSelectedMode = false | 'single' | 'multiple';
type PieLabelPosition = 'outside' | 'inside' | 'center';

export interface PieUISettings {
    // Forme / géométrie
    isDonut: boolean;
    innerRadius: number;      // 0..99 (sera clampé)
    outerRadius: number;      // 1..100
    centerX: number;          // 0..100 (%)
    centerY: number;          // 0..100 (%)

    // Disposition / calcul
    avoidLabelOverlap: boolean;
    startAngle: number;       // 90 par défaut
    clockwise: boolean;
    minAngle: number;         // 0 par défaut
    padAngle: number;         // 0 par défaut

    // Styles / interactions
    roseType: PieRoseType;    // false | 'radius' | 'area'
    selectedMode: PieSelectedMode;
    selectedOffset: number;   // px
    hoverAnimation: boolean;
    stillShowZeroSum: boolean;

    // Labels
    labelShow: boolean;
    labelPosition: PieLabelPosition;
    labelFormatter: string;   // ex: "{b}: {c} ({d}%)"
    // Labels – orientation & ancrage
    labelAlignTo: 'none' | 'labelLine' | 'edge';
    labelEdgeDistance: number;      // en px pour alignTo='edge'
    useLabelLayout: boolean;        // active la logique par-part
    labelLayoutOffsetX: number;     // décalage horizontal (px) gauche/droite


    // Lignes de label
    labelLineShow: boolean;
    labelLineLength: number;
    labelLineLength2: number;

    // Labels – alignement quand position = 'inside'

    labelInsideAlign: 'left' | 'center' | 'right';
    labelInsideVerticalAlign: 'top' | 'middle' | 'bottom';
    labelInsideOffsetX: number;   // décalage horizontal en px
    labelInsideOffsetY: number;   // décalage vertical en px

    // Labels – style
    labelColor: string;
    labelFontSize: number;
    labelFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    labelBackgroundColor: string;
    labelPadding: number;       // px
    labelBorderRadius: number;  // px
    labelTextShadowColor: string;
    labelTextShadowBlur: number;


    //  Apparence des secteurs
    itemBorderColor: string;
    itemBorderWidth: number;
    itemBorderRadius: number;

    // Emphasis (survol)
    emphasisFocus: 'none' | 'self' | 'series';
    emphasisScaleSize: number;
    emphasisLabelShow: boolean;
    emphasisLabelLineShow: boolean;
    emphasisShadowBlur: number;
    emphasisShadowColor: string;
    emphasisLabelFontSize: number;
    emphasisLabelFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;

    // Tooltip (affichage des valeurs)
    tooltipEnabled: boolean;          // afficher/masquer la tooltip
    tooltipDecimalsValue: number;     // décimales pour la valeur
    tooltipDecimalsPercent: number;   // décimales pour le %
    tooltipThousandsSep: boolean;     // séparateur de milliers pour la valeur
    tooltipShowPercent: boolean;      // afficher le pourcentage
    tooltipUnit: string;
    // Tooltip – style & comportement
    tooltipBg: string;
    tooltipTextColor: string;
    tooltipFontSize: number;
    tooltipFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    tooltipBorderColor: string;
    tooltipBorderWidth: number;
    tooltipBorderRadius: number;  // px (via extraCssText)
    tooltipPadding: number;       // px
    tooltipShadowBlur: number;    // px (via extraCssText)
    tooltipShadowColor: string;   // rgba/hex
    tooltipConfine: boolean;      // empêche de dépasser le conteneur
    tooltipTriggerOn: 'mousemove' | 'click' | 'mousemove|click' | 'none';

    // Legende (sur le graphique)
    legendShow: boolean;
    legendType: 'plain' | 'scroll';
    legendOrient: 'horizontal' | 'vertical';
    // legendTop: string | number;
    // legendLeft: string | number;
    legendItemWidth: number;
    legendItemHeight: number;
    legendItemGap: number;
    legendIcon: 'auto' | 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
    legendTextColor: string;
    legendTextSize: number;
    legendResponsiveSizing: boolean; // Active/désactive le redimensionnement auto de la police
    legendTextWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    legendFormatter: string;
    legendSelectedMode: false | 'single' | 'multiple';
    legendUseXY: boolean;
    legendPosX: number;
    legendPosY: number;
    // legendPosUnit: 'px' | '%';


    // titre et sous titre

    titleEnabled: boolean;
    titleText: string;
    titleColor: string;
    titleFontSize: number;
    titleFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    titleOffsetX: number;
    titleOffsetY: number;
    titleItemGap: number;   // espace entre titre et sous-titre (px)

    subtitleEnabled: boolean;
    subtitleText: string;
    subtitleColor: string;
    subtitleFontSize: number;
    subtitleFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;

    // Cadre du titre (bloc title)
    titleBoxEnabled: boolean;
    titleBoxBg: string;
    titleBoxBorderColor: string;
    titleBoxBorderWidth: number;
    titleBoxBorderRadius: number;
    titleBoxPadding: number; // padding uniforme en %
    titleTextAlign: 'left' | 'center' | 'right';
    // titleTextVerticalAlign: 'top' | 'middle' | 'bottom';

    // Décalage indépendant du sous-titre (si utilisé en élément séparé)
    // subtitleOffsetX: number;
    // subtitleOffsetY: number;


}






// Groupe de catégories (agrégation)
interface CategoryGroup {
    name: string;       // nom du groupe (apparaît comme une catégorie)
    members: string[];  // catégories membres (noms originaux)
    color: string;      // couleur du groupe
    visible: boolean;   // géré via la légende (on mettra true par défaut)
}

// interface du graphique en Bar

type BarLabelPosition =
    | 'top' | 'left' | 'right' | 'bottom'
    | 'inside' | 'insideTop' | 'insideBottom' | 'insideLeft' | 'insideRight'
    | 'insideTopLeft' | 'insideTopRight' | 'insideBottomLeft' | 'insideBottomRight';

export interface BarUISettings {
    // Grille
    gridLeft: number;
    gridRight: number;
    gridTop: number;
    gridBottom: number;
    gridContainLabel: boolean;

    // Axes
    xShow: boolean;
    yShow: boolean;
    xAxisRotate: number;        // rotation des labels X (degrés)
    xAxisLabelSize: number;
    xAxisLabelColor: string;
    yAxisLabelSize: number;
    yAxisLabelColor: string;
    ySplitLineShow: boolean;

    // Série (barres)
    barWidthPx: number;         // 0 => auto
    barGap: string;             // ex: '30%'
    barCategoryGap: string;     // ex: '20%'
    barBorderRadius: number;

    // Label de série
    labelShow: boolean;
    labelPosition: BarLabelPosition;
    labelFormatter: string;     // ex: '{c}' ou '{b}: {c}'
    labelColor: string;
    labelFontSize: number;
    labelFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;

    // Animation
    animation: boolean;
    animationDuration: number;
    animationEasing:
    | 'linear' | 'quadraticIn' | 'quadraticOut' | 'quadraticInOut'
    | 'cubicIn' | 'cubicOut' | 'cubicInOut'
    | 'quarticIn' | 'quarticOut' | 'quarticInOut'
    | 'quinticIn' | 'quinticOut' | 'quinticInOut'
    | 'sinusoidalIn' | 'sinusoidalOut' | 'sinusoidalInOut'
    | 'exponentialIn' | 'exponentialOut' | 'exponentialInOut'
    | 'circularIn' | 'circularOut' | 'circularInOut'
    | 'elasticIn' | 'elasticOut' | 'elasticInOut'
    | 'backIn' | 'backOut' | 'backInOut'
    | 'bounceIn' | 'bounceOut' | 'bounceInOut';

    // Emphasis
    emphasisFocus: 'none' | 'self' | 'series';
    emphasisShadowBlur: number;
    emphasisShadowColor: string;
    emphasisLabelShow: boolean;

    // DataZoom
    dataZoomInside: boolean;
    dataZoomSlider: boolean;
    dataZoomStart: number;      // %
    dataZoomEnd: number;        // %

    dzUseXY: boolean;
    dzPosUnit: 'px' | '%';
    dzOffsetX: number;
    dzOffsetY: number;
    dzWidth?: number | null;
    dzHeight?: number | null;
    // Légende (sur le graphique)
    legendShow: boolean;
    legendType: 'plain' | 'scroll';
    legendOrient: 'horizontal' | 'vertical';
    // legendTop: number | 'top' | 'middle' | 'bottom';
    // legendLeft: number | 'left' | 'center' | 'right';
    legendUseXY: boolean;
    legendPosX: number;
    legendPosY: number;
    // legendPosUnit: 'px' | '%';
    legendItemWidth: number;
    legendItemHeight: number;
    legendItemGap: number;
    legendIcon: 'auto' | 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
    legendTextColor: string;
    legendTextSize: number;
    legendTextWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    legendFormatter: string;       // ex: '{name}' ou '• {name}'
    legendSelectedMode: false | 'single' | 'multiple';


    titleEnabled: boolean;
    titleText: string;
    titleColor: string;
    titleFontSize: number;
    titleFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    titleOffsetX: number;
    titleOffsetY: number;
    titleItemGap: number;
    titleTextAlign: 'left' | 'center' | 'right';
    titleTextVerticalAlign: 'top' | 'middle' | 'bottom';

    subtitleEnabled: boolean;
    subtitleText: string;
    subtitleColor: string;
    subtitleFontSize: number;
    subtitleFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    subtitleOffsetX: number;
    subtitleOffsetY: number;
    subtitleTextAlign: 'left' | 'center' | 'right';

    titleBoxEnabled: boolean;
    titleBoxBg: string;
    titleBoxBorderColor: string;
    titleBoxBorderWidth: number;
    titleBoxBorderRadius: number;
    titleBoxPadding: number;
    tooltipEnabled: boolean;
    tooltipDecimalsValue: number;
    tooltipThousandsSep: boolean;
    tooltipUnit: string;
    tooltipBg: string;
    tooltipTextColor: string;
    tooltipFontSize: number;
    tooltipFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    tooltipBorderColor: string;
    tooltipBorderWidth: number;
    tooltipBorderRadius: number;
    tooltipPadding: number;
    tooltipShadowBlur: number;
    tooltipShadowColor: string;
    tooltipConfine: boolean;
    tooltipTriggerOn: 'mousemove' | 'click' | 'mousemove|click' | 'none';

    xAxisLabel: {
        show: boolean;
        text: string;
        offset: number; // %
        color: string;
        fontSize: number;
        fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    };
    yAxisLabel: {
        show: boolean;
        text: string;
        offset: number; // %
        color: string;
        fontSize: number;
        fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
        vertical: boolean; // spécifique à Y
    };
}




// Interface du graphique en ligne




export type LineSymbol =
    | 'emptyCircle' | 'circle' | 'rect' | 'roundRect' | 'triangle'
    | 'diamond' | 'pin' | 'arrow' | 'none';

export type LineStep = false | 'start' | 'middle' | 'end';

export interface LineUISettings {
    // Grille
    gridLeft: number; gridRight: number; gridTop: number; gridBottom: number;
    gridContainLabel: boolean;

    // Axe X
    xShow: boolean;
    xBoundaryGap: [number | string, number | string] | boolean; // ECharts: tuple ou boolean
    xAxisLabelColor: string; xAxisLabelSize: number; xAxisRotate: number;

    // Axe Y
    yShow: boolean;
    ySplitLineShow: boolean;
    yAxisLabelColor: string; yAxisLabelSize: number;

    // Série (ligne)
    smooth: boolean;
    showSymbol: boolean; symbol: LineSymbol; symbolSize: number;
    connectNulls: boolean;
    lineWidth: number;
    lineType: 'solid' | 'dashed' | 'dotted';
    step: LineStep;
    areaOpacity: number;             // 0..1 (0 = sans zone)
    stack: string | null;            // empilement (ou null pour désactiver)

    // Labels sur les points
    labelShow: boolean;
    labelPosition: 'top' | 'left' | 'right' | 'bottom' | 'inside' | 'insideTop';
    labelFormatter: string; // ex: '{c}'
    labelColor: string; labelFontSize: number;
    labelFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;

    // Emphasis
    emphasisFocus: 'none' | 'series';
    emphasisShadowBlur: number; emphasisShadowColor: string;
    emphasisLabelShow: boolean;

    // Animation
    animation: boolean;
    animationDuration: number;
    animationEasing: 'linear' | 'cubicOut' | 'bounceOut' | 'elasticOut' | string;

    // DataZoom
    dataZoomInside: boolean;
    dataZoomSlider: boolean;
    dataZoomStart: number; dataZoomEnd: number;
    dzUseXY: boolean;
    dzOffsetX: number; dzOffsetY: number;
    dzWidth?: number | null; dzHeight?: number | null;
    // dzPosUnit: 'px' | '%';

    // Légende
    legendShow: boolean;
    legendType: 'plain' | 'scroll';
    legendOrient: 'horizontal' | 'vertical';
    // legendTop: number | 'top' | 'middle' | 'bottom';
    // legendLeft: number | 'left' | 'center' | 'right';
    legendItemWidth: number; legendItemHeight: number; legendItemGap: number;
    legendIcon: 'auto' | LineSymbol;
    legendTextColor: string; legendTextSize: number;
    legendTextWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    legendFormatter: string; // ex: '{name}' ou '{name}: {value}'
    legendSelectedMode: false | 'single' | 'multiple';
    legendUseXY: boolean;
    legendPosX: number; legendPosY: number;
    // legendPosUnit: 'px' | '%';



    titleEnabled: boolean;
    titleText: string;
    titleColor: string;
    titleFontSize: number;
    titleFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    titleOffsetX: number;
    titleOffsetY: number;
    titleItemGap: number;     // espace entre titre et sous-titre (px)
    titleTextAlign: 'left' | 'center' | 'right';
    // titleTextVerticalAlign: 'top' | 'middle' | 'bottom';

    subtitleEnabled: boolean;
    subtitleText: string;
    subtitleColor: string;
    subtitleFontSize: number;
    subtitleFontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    // subtitleOffsetX: number;  // px (si voulu séparé du bloc titre)
    // subtitleOffsetY: number;

    // Cadre (box) autour du bloc titre
    titleBoxEnabled: boolean;
    titleBoxBg: string;
    titleBoxBorderColor: string;
    titleBoxBorderWidth: number;
    titleBoxBorderRadius: number;
    titleBoxPadding: number;  // padding uniforme


    // --- Nom Axe X ---
    xAxisLabel: {
        show: boolean;
        text: string;
        offset: number; // %
        color: string;
        fontSize: number;
        fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    };
    yAxisLabel: {
        show: boolean;
        text: string;
        offset: number; // %
        color: string;
        fontSize: number;
        fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
        vertical: boolean; // spécifique à Y
    };
}


@Component({
    selector: 'app-modal-graphic',
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule,
        MatFormFieldModule, MatSelectModule, MatTooltipModule, MatCheckboxModule, MatRadioModule,
        MatExpansionModule, NgxEchartsModule, NgxColorsModule, MatButtonToggleModule,
    ],
    templateUrl: './modal.graphic.component.html',
    styleUrls: ['./modal.graphic.component.css']
})
export class ModalGraphicComponent implements OnInit {

    // ====================================================================
    // SECTION : PROPRIÉTÉS DE LA CLASSE
    // ====================================================================
    // --- PROPRIÉTÉ de gestion de redimentionnement et de position des elements dans le contenair graphic ---
    @ViewChild('echartsInstance') echartsInstance: ECharts | undefined;
    private echartsSvc: any;

    // --- PROPRIÉTÉS D'ÉTAT DE L'INTERFACE ---
    isSidebarOpen = true;
    selectedChartType: string = 'pie';
    chartOptions: EChartsOption | null = null;

    // --- PROPRIÉTÉS POUR LA GESTION DES COUCHES ---
    private allLayers: Layer[] = [];
    private searchTerm$ = new BehaviorSubject<string>('');
    public filteredLayers$: Observable<Layer[]>;
    selectedLayerId: string = '';

    // --- PROPRIÉTÉS POUR LA GESTION DES CHAMPS ---
    availableFields: ColumnInfo[] = [];
    isFieldsLoading = false;


    // --- PROPRIÉTÉS POUR LA SÉLECTION (CAMEMBERT / BARRES) ---
    categoryColumn: string | null = null;
    valueColumn: string | null = null;
    includeNullsPie = false;
    unspecifiedLabelPie = 'Non spécifié';
    // (Optionnel) si on veut aussi pour 'bar' mono-table via la même route:
    includeNullsBar = false;
    unspecifiedLabelBar = 'Non spécifié';


    // --- PROPRIÉTÉS POUR LA SÉLECTION (BARRES GROUPÉES) ---
    dimensionColumnBar: string | null = null;
    categoryColumnBar: string | null = null;
    valueColumnBar: string | null = null;
    includeNullsBarGrouped = false;
    unspecifiedLabelBarGrouped = 'Non spécifié';


    // -- propriété pour le l'affichage du bouton de la tooltip bar et bar groupé

    barTooltipEnabled = true;

    // --- PROPRIÉTÉS POUR LA SÉLECTION (Lignes) ---
    dimensionColumnLine: string | null = null; // X
    valueColumnLine: string | null = null;     // Y
    seriesColumnLine: string | null = null;    // optionnel
    includeNullsLine = false; // va permettre d'inclure ou pas les valeurs nulles dans les requetes 

    // --- PROPRIÉTÉS POUR LA VALIDATION ---
    areLayersCompatible = false;
    isValidationLoading = false;
    compatibilityError: string | null = null;
    valueColumnError: string | null = null;

    // --- PROPRIÉTÉ POUR LA LÉGENDE ---
    legendCategories: LegendCategory[] = [];
    private rawChartData: any[] = [];

    // --Propriété du dark dode et pattern

    isDarkMode = false;
    useDecalPattern = false;

    //flag pour  la selection spatiale
    useSpatialFilter = false;




    // --- PARAMÈTRES UI DU CAMEMBERT/DONUT ---

    pieUI: PieUISettings = {
        isDonut: true,
        innerRadius: 40,
        outerRadius: 70,
        centerX: 50,
        centerY: 50,

        avoidLabelOverlap: true,
        startAngle: 90,
        clockwise: true,
        minAngle: 0,
        padAngle: 0,

        roseType: false,
        selectedMode: false,
        selectedOffset: 8,
        hoverAnimation: true,
        stillShowZeroSum: true,

        labelShow: true,
        labelPosition: 'inside',
        labelFormatter: '{b}: {c} ({d}%)',

        labelLineShow: false,
        labelLineLength: 15,
        labelLineLength2: 10,

        labelAlignTo: 'labelLine',
        labelEdgeDistance: 12,
        useLabelLayout: true,
        labelLayoutOffsetX: 8,

        labelInsideAlign: 'center',
        labelInsideVerticalAlign: 'middle',
        labelInsideOffsetX: 0,
        labelInsideOffsetY: 0,

        labelColor: '#333',
        labelFontSize: 12,
        labelFontWeight: 'normal',
        labelBackgroundColor: 'transparent',
        labelPadding: 0,
        labelBorderRadius: 0,
        labelTextShadowColor: 'rgba(0,0,0,0)',
        labelTextShadowBlur: 0,


        itemBorderColor: '#fff',
        itemBorderWidth: 2,
        itemBorderRadius: 15,

        emphasisFocus: 'self',
        emphasisScaleSize: 8,
        emphasisLabelShow: true,
        emphasisLabelLineShow: true,
        emphasisShadowBlur: 10,
        emphasisShadowColor: 'rgba(69, 90, 100,0.35)',
        emphasisLabelFontSize: 40,
        emphasisLabelFontWeight: 'bold',

        tooltipEnabled: true,
        tooltipDecimalsValue: 2,
        tooltipDecimalsPercent: 2,
        tooltipThousandsSep: true,
        tooltipShowPercent: true,
        tooltipUnit: '',


        tooltipBg: 'rgba(50,50,50,0.9)',
        tooltipTextColor: '#fff',
        tooltipFontSize: 12,
        tooltipFontWeight: 'normal',
        tooltipBorderColor: 'rgba(0,0,0,0)',
        tooltipBorderWidth: 0,
        tooltipBorderRadius: 6,
        tooltipPadding: 8,
        tooltipShadowBlur: 8,
        tooltipShadowColor: 'rgba(0,0,0,0.25)',
        tooltipConfine: true,
        tooltipTriggerOn: 'mousemove',


        // la logique de la legende, du titre et du sous titres est utilisé dans la options de configurations de tout les autres graphique

        legendShow: true,
        legendType: 'plain',
        legendOrient: 'horizontal',
        // legendTop: 'bottom',
        // legendLeft: 'center',
        legendItemWidth: 14,
        legendItemHeight: 14,
        legendItemGap: 10,
        legendIcon: 'auto',
        legendTextColor: '#333',
        legendTextSize: 12,
        legendResponsiveSizing: true,
        legendTextWeight: 'normal',
        legendFormatter: '{name}: {value} ({percent}%)',
        legendSelectedMode: false,
        legendUseXY: true,
        legendPosX: 2,
        legendPosY: 90,
        // legendPosUnit: '%',

        // titre et sous titre
        titleEnabled: true,
        titleText: 'Production Agricole',
        titleColor: '#333',
        titleFontSize: 24,
        titleFontWeight: 'bold',
        titleOffsetX: 52,
        titleOffsetY: 2,
        titleItemGap: 6,

        subtitleEnabled: false,
        subtitleText: '',
        subtitleColor: '#666',
        subtitleFontSize: 14,
        subtitleFontWeight: 'normal',

        // --- Cadre du titre ---
        titleBoxEnabled: false,
        titleBoxBg: 'transparent',
        titleBoxBorderColor: '#000',
        titleBoxBorderWidth: 0,
        titleBoxBorderRadius: 8,
        titleBoxPadding: 0,
        titleTextAlign: 'center',
        // titleTextVerticalAlign: 'top',

        // --- Décalage sous-titre (0 = même bloc que le titre) ---
        // subtitleOffsetX: 39,
        // subtitleOffsetY: 9,

    };

    // --- PARAMÈTRES UI DU Diagramme en BAR---

    barUI: BarUISettings = {
        // Grille
        gridLeft: 10, gridRight: 8, gridTop: 15, gridBottom: 10, gridContainLabel: true,
        // Axes
        xShow: true, yShow: true,
        xAxisRotate: 0, xAxisLabelSize: 12, xAxisLabelColor: '#666',
        yAxisLabelSize: 12, yAxisLabelColor: '#666',
        ySplitLineShow: true,
        // Série
        barWidthPx: 0, barGap: '30%', barCategoryGap: '20%', barBorderRadius: 6,
        // Label
        labelShow: false, labelPosition: 'top', labelFormatter: '{c}',
        labelColor: '#333', labelFontSize: 12, labelFontWeight: 'normal',
        // Animation
        animation: true, animationDuration: 800, animationEasing: 'cubicOut',
        // Emphasis
        emphasisFocus: 'series', emphasisShadowBlur: 10, emphasisShadowColor: 'rgba(0,0,0,0.25)', emphasisLabelShow: false,
        // DataZoom
        dataZoomInside: false, dataZoomSlider: false, dataZoomStart: 0, dataZoomEnd: 100,

        dzUseXY: true,
        dzPosUnit: '%',
        dzOffsetX: 7,
        dzOffsetY: 93,
        dzWidth: null,
        dzHeight: null,

        // --- Légende ---
        legendShow: true,
        legendType: 'scroll',
        legendOrient: 'vertical',
        // legendTop: 'top' as const,
        // legendLeft: 'right' as const,
        legendItemWidth: 14,
        legendItemHeight: 14,
        legendItemGap: 10,
        legendIcon: 'auto',
        legendTextColor: '#333',
        legendTextSize: 12,
        legendTextWeight: 'normal',
        legendFormatter: '{name} : {value}',
        legendSelectedMode: 'multiple' as const,
        legendUseXY: true,
        legendPosX: 2,
        legendPosY: 15,
        // legendPosUnit: '%',

        tooltipEnabled: true,
        tooltipDecimalsValue: 2,
        tooltipThousandsSep: true,
        tooltipUnit: '',
        tooltipBg: 'rgba(50,50,50,0.9)',
        tooltipTextColor: '#fff',
        tooltipFontSize: 12,
        tooltipFontWeight: 'normal',
        tooltipBorderColor: 'rgba(0,0,0,0)',
        tooltipBorderWidth: 0,
        tooltipBorderRadius: 6,
        tooltipPadding: 8,
        tooltipShadowBlur: 8,
        tooltipShadowColor: 'rgba(0,0,0,0.25)',
        tooltipConfine: true,
        tooltipTriggerOn: 'mousemove',
        titleEnabled: true,
        titleText: 'Graphique à barres',
        titleColor: '#333333',
        titleFontSize: 24,
        titleFontWeight: 'bold',
        titleOffsetX: 25,
        titleOffsetY: 2,
        titleItemGap: 6,
        titleTextAlign: 'left',
        titleTextVerticalAlign: 'top',

        subtitleEnabled: false,
        subtitleText: '',
        subtitleColor: '#666666',
        subtitleFontSize: 14,
        subtitleFontWeight: 'normal',
        subtitleOffsetX: 39,
        subtitleOffsetY: 9,
        subtitleTextAlign: 'center',
        titleBoxEnabled: false,
        titleBoxBg: 'transparent',
        titleBoxBorderColor: '#000000',
        titleBoxBorderWidth: 0,
        titleBoxBorderRadius: 8,
        titleBoxPadding: 8,

        // Nom Axe X
        xAxisLabel: {
            show: false, // désactivé par défaut
            text: 'Axe X',
            offset: 50, // %
            color: '#333333',
            fontSize: 14,
            fontWeight: 'normal'
        },
        yAxisLabel: {
            show: false, // désactivé par défaut
            text: 'Axe Y',
            offset: 50, // %
            color: '#333333',
            fontSize: 14,
            fontWeight: 'normal',
            vertical: true // vertical par défaut pour Y
        }
    };

    //parametres par defaut du diagramme en ligne



    lineUI: LineUISettings = {
        // Grille
        gridLeft: 10, gridRight: 8, gridTop: 15, gridBottom: 10,
        gridContainLabel: true,

        // Axe X
        xShow: true,
        xBoundaryGap: true,
        xAxisLabelColor: '#666666', xAxisLabelSize: 12, xAxisRotate: 0,

        // Axe Y
        yShow: true,
        ySplitLineShow: true,
        yAxisLabelColor: '#666666', yAxisLabelSize: 12,

        // Série (ligne)
        smooth: false,
        showSymbol: true, symbol: 'emptyCircle', symbolSize: 6,
        connectNulls: false,
        lineWidth: 2,
        lineType: 'solid',
        step: false,
        areaOpacity: 0,                 // 0 => pas de zone
        stack: null,

        // Labels
        labelShow: false,
        labelPosition: 'top',
        labelFormatter: '{c}',
        labelColor: '#666666',
        labelFontSize: 11,
        labelFontWeight: 'normal',

        // Emphasis
        emphasisFocus: 'series',
        emphasisShadowBlur: 6,
        emphasisShadowColor: 'rgba(0,0,0,0.3)',
        emphasisLabelShow: false,

        // Animation
        animation: true,
        animationDuration: 500,
        animationEasing: 'cubicOut',

        // DataZoom
        dataZoomInside: true,
        dataZoomSlider: false,
        dataZoomStart: 0, dataZoomEnd: 100,
        dzUseXY: false,
        dzOffsetX: 0, dzOffsetY: 0,
        dzWidth: null, dzHeight: null,
        // dzPosUnit: 'px',

        // Légende
        legendShow: true,
        legendType: 'plain',
        legendOrient: 'horizontal',
        // legendTop: 'top',
        // legendLeft: 'center',
        legendItemWidth: 18, legendItemHeight: 12, legendItemGap: 12,
        legendIcon: 'auto',
        legendTextColor: '#666666', legendTextSize: 12, legendTextWeight: 'normal',
        legendFormatter: '{name}',
        legendSelectedMode: 'multiple',
        legendUseXY: true,
        legendPosX: 47, legendPosY: 91,
        //  legendPosUnit: 'px',

        // --- Titre / Sous-titre (LINE) ---
        titleEnabled: true,
        titleText: 'Courbe de tendance',
        titleColor: '#333333',
        titleFontSize: 16,
        titleFontWeight: 'bold',
        titleOffsetX: 48,
        titleOffsetY: 0,
        titleItemGap: 6,
        titleTextAlign: 'center',
        // titleTextVerticalAlign: 'top',

        subtitleEnabled: false,
        subtitleText: '',
        subtitleColor: '#666666',
        subtitleFontSize: 12,
        subtitleFontWeight: 'normal',
        // subtitleOffsetX: 0,
        // subtitleOffsetY: 0,

        titleBoxEnabled: false,
        titleBoxBg: 'transparent',
        titleBoxBorderColor: '#000000',
        titleBoxBorderWidth: 0,
        titleBoxBorderRadius: 8,
        titleBoxPadding: 8,

        // Nom Axe X
        xAxisLabel: {
            show: false, // désactivé par défaut
            text: 'Axe X',
            offset: 50, // %
            color: '#333333',
            fontSize: 14,
            fontWeight: 'normal'
        },
        yAxisLabel: {
            show: false, // désactivé par défaut
            text: 'Axe Y',
            offset: 50, // %
            color: '#333333',
            fontSize: 14,
            fontWeight: 'normal',
            vertical: true // vertical par défaut pour Y
        }
    };



    // --- GROUPAGE DE CATÉGORIES (UI + état) ---
    categoryGroups: CategoryGroup[] = [];
    groupSelection = new Set<string>();
    newGroupName: string = '';
    newGroupColor: string = '#720303ff';


    // --- GETTERS UTILES POUR LE TEMPLATE ---
    get textFields(): ColumnInfo[] {
        return this.availableFields.filter(f => !['bigint', 'integer', 'numeric', 'double precision', 'real', 'smallint'].includes(f.type));
    }
    get numericFields(): ColumnInfo[] {
        return this.availableFields.filter(f => ['bigint', 'integer', 'numeric', 'double precision', 'real', 'smallint'].includes(f.type));
    }
    public get selectedLayersCount(): number {
        return this.allLayers.filter(l => l.visible).length;
    }

    // Propriétés pour afficher les données requétés dasn un tableau
    tableColumns: string[] = [];
    tableColumnAliases: { [key: string]: string } = {}; //alias pour éditer les en-tetes
    tableData: any[] = [];

    // Couleurs par defaut des diagrammes
    private readonly DEFAULT_COLORS = [
        '#5470c6', '#88a7e4', '#91cc75', '#bde6ad', '#fac858', '#fee4ba', '#ee6666', '#f6aaaa', '#73c0de', '#3ba272', '#fc8452'
    ];


    /** synchronise la légende latérale sur l’ordre des séries tracées (sans toucher aux groupes). */
    private syncLegendToSeriesOrder(seriesOrder: string[]): void {
        // on conserve la visibilité existante
        const visibleMap = new Map(this.legendCategories.map(c => [c.name, c.visible]));

        this.legendCategories = seriesOrder.map((name, i) => {
            const wasVisible = visibleMap.get(name);
            return {
                name,
                color: this.DEFAULT_COLORS[i % this.DEFAULT_COLORS.length], // même palette, index = ordre des séries
                visible: wasVisible ?? true
            };
        });
    }




    // helper dedié au camembert
    private formatNumberForLegend(val: number): string {
        const dec = this.pieUI.tooltipDecimalsValue ?? 2;
        const thousands = this.pieUI.tooltipThousandsSep ?? true;
        const unit = this.pieUI.tooltipUnit || '';
        const n = Number(val ?? 0);
        const fixed = n.toFixed(dec);
        const parts = fixed.split('.');
        if (thousands) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.') + (unit ? ` ${unit}` : '');
    }


    // ------- Helpers dédiés aux barres -------


    // Afficher une légende "catégories" pour les graphiques en barres.
    private buildLegendForBar(names: string[], valueMap?: Map<string, number>) {
        const s = this.barUI;

        // ⬅ si OFF, on renvoie une config qui masque explicitement
        if (!s.legendShow) return { show: false };

        const selected: Record<string, boolean> = {};
        this.legendCategories.forEach(c => {
            if (names.includes(c.name)) selected[c.name] = !!c.visible;
        });


        const positionConfig = s.legendUseXY
            ? {
                left: `${s.legendPosX}%`,
                top: `${s.legendPosY}%`
            }
            : {
                left: 'auto', // Laisse ECharts décider si non-XY
                top: 'auto'
            };

        const fmt = (num: number, decimals: number, thousands: boolean) => {
            const n = Number(num ?? 0);
            const fixed = n.toFixed(this.pieUI.tooltipDecimalsValue ?? decimals);
            if (!thousands) return fixed;
            const parts = fixed.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            return parts.join('.');
        };

        return {
            show: true,
            type: s.legendType,
            orient: s.legendOrient,
            // ...pos,
            ...positionConfig,
            itemWidth: s.legendItemWidth,
            itemHeight: s.legendItemHeight,
            itemGap: s.legendItemGap,
            icon: s.legendIcon === 'auto' ? undefined : s.legendIcon,
            textStyle: {
                color: s.legendTextColor,
                fontSize: s.legendTextSize,
                fontWeight: s.legendTextWeight
            },
            selectedMode: s.legendSelectedMode,
            data: names,
            selected,
            formatter: (name: string) => {
                let out = (s.legendFormatter || '{name}').trim();
                out = out.replace('{name}', name);
                if (valueMap && out.includes('{value}')) {
                    const v = valueMap.get(name) ?? 0;
                    const valStr = fmt(v, this.pieUI.tooltipDecimalsValue ?? 2, this.pieUI.tooltipThousandsSep ?? true);
                    const unitStr = this.pieUI.tooltipUnit ? ` ${this.pieUI.tooltipUnit}` : '';
                    out = out.replace('{value}', `${valStr}${unitStr}`);
                }
                return out;
            }
        };
    }
    // formateur dédié au tooltip Bar et bar groupé

    private formatBarValue(n: number): string {
        const v = Number(n ?? 0);
        const fixed = v.toFixed(2);
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    }
    // logique de positionnement du titre, sous titre et padding

    private buildBarTitleConfig(): any {
        const sb = this.barUI;

        if (!sb.titleEnabled && !sb.subtitleEnabled) {
            return undefined;
        }

        // Si on veut un cadre unique autour des deux textes
        if (sb.titleBoxEnabled) {
            return {
                text: sb.titleEnabled ? sb.titleText : '',
                subtext: sb.subtitleEnabled ? sb.subtitleText : '',
                left: `${sb.titleOffsetX}%`,
                top: `${sb.titleOffsetY}%`,
                itemGap: sb.titleItemGap,
                textAlign: 'center',
                textStyle: {
                    color: sb.titleColor,
                    fontSize: sb.titleFontSize,
                    fontWeight: sb.titleFontWeight
                },
                subtextStyle: {
                    color: sb.subtitleColor,
                    fontSize: sb.subtitleFontSize,
                    fontWeight: sb.subtitleFontWeight
                },
                // Le padding s'applique à l'ensemble titre + sous-titre
                backgroundColor: sb.titleBoxBg,
                borderColor: sb.titleBoxBorderColor,
                borderWidth: sb.titleBoxBorderWidth,
                borderRadius: sb.titleBoxBorderRadius,
                padding: sb.titleBoxPadding
            };
        }

        // Sinon, garder votre logique actuelle sans cadre
        const titleConfig: any[] = [];

        if (sb.titleEnabled) {
            titleConfig.push({
                text: sb.titleText || '',
                left: `${sb.titleOffsetX}%`,
                top: `${sb.titleOffsetY}%`,
                textAlign: 'center',
                textStyle: {
                    color: sb.titleColor,
                    fontSize: sb.titleFontSize,
                    fontWeight: sb.titleFontWeight
                }
            });
        }

        if (sb.subtitleEnabled) {
            const baseTop = sb.titleOffsetY || 0;
            const titleHeight = sb.titleFontSize || 16;
            const gap = sb.titleItemGap || 5;
            const subtitleTop = baseTop + (titleHeight / 4) + gap;

            titleConfig.push({
                text: sb.subtitleText || '',
                left: `${sb.titleOffsetX}%`,
                top: `${subtitleTop}%`,
                textAlign: 'center',
                textStyle: {
                    color: sb.subtitleColor,
                    fontSize: sb.subtitleFontSize,
                    fontWeight: sb.subtitleFontWeight
                }
            });
        }

        return titleConfig.length > 0 ? titleConfig : undefined;
    }




    private buildLegendForLine(names: string[]): any {
        const L = this.lineUI;
        if (!L.legendShow) return { show: false };

        // Position toujours en %
        const positionConfig = {
            left: `${L.legendPosX}%`,
            top: `${L.legendPosY}%`
        };

        return {
            show: true,
            type: L.legendType,
            orient: L.legendOrient,
            ...positionConfig,  // ← POSITION TOUJOURS EN %
            itemWidth: L.legendItemWidth,
            itemHeight: L.legendItemHeight,
            itemGap: L.legendItemGap,
            icon: L.legendIcon === 'auto' ? undefined : L.legendIcon,
            textStyle: {
                color: L.legendTextColor,
                fontSize: L.legendTextSize,
                fontWeight: L.legendTextWeight
            },
            selectedMode: L.legendSelectedMode,
            data: names,
            formatter: (name: string) => {
                const tpl = (L.legendFormatter || '{name}').trim();
                return tpl ? tpl.replace('{name}', name) : name;
            }
        };
    }


    private updateLegendForLine(names: string[]): void {
        // sauvegarde (avant reset)
        const prevColor = new Map(this.legendCategories.map(c => [c.name, c.color]));
        const prevVisible = new Map(this.legendCategories.map(c => [c.name, c.visible]));
        const savedGroups = this.categoryGroups.map(g => ({ ...g, members: [...g.members] }));

        // met à jour la légende (reset couleurs/groupes)
        this.updateLegend(names);

        // restaure les groupes
        this.categoryGroups = savedGroups;

        // restaure couleurs/visibilités quand le nom est identique
        this.legendCategories = this.legendCategories.map(c => ({
            ...c,
            color: prevColor.get(c.name) ?? c.color,
            visible: prevVisible.get(c.name) ?? c.visible
        }));
    }


    private buildLineTitleConfig(): any {
        const sl = this.lineUI;

        if (!sl.titleEnabled && !sl.subtitleEnabled) {
            return undefined;
        }

        // Si on veut un cadre unique autour des deux textes
        if (sl.titleBoxEnabled) {
            return {
                text: sl.titleEnabled ? sl.titleText : '',
                subtext: sl.subtitleEnabled ? sl.subtitleText : '',
                left: `${sl.titleOffsetX}%`,  // ← UTILISER titleOffsetX EN %
                top: `${sl.titleOffsetY}%`,
                itemGap: sl.titleItemGap,
                textAlign: 'center',  // ← CENTRAGE DU TEXTE
                textStyle: {
                    color: sl.titleColor,
                    fontSize: sl.titleFontSize,
                    fontWeight: sl.titleFontWeight
                },
                subtextStyle: {
                    color: sl.subtitleColor,
                    fontSize: sl.subtitleFontSize,
                    fontWeight: sl.subtitleFontWeight
                },
                // Le padding s'applique à l'ensemble titre + sous-titre
                backgroundColor: sl.titleBoxBg,
                borderColor: sl.titleBoxBorderColor,
                borderWidth: sl.titleBoxBorderWidth,
                borderRadius: sl.titleBoxBorderRadius,
                padding: sl.titleBoxPadding
            };
        }

        // Sinon, logique sans cadre
        const titleConfig: any[] = [];

        if (sl.titleEnabled) {
            titleConfig.push({
                text: sl.titleText || '',
                left: `${sl.titleOffsetX}%`,  // ← UTILISER titleOffsetX EN %
                top: `${sl.titleOffsetY}%`,
                textAlign: 'center',  // ← CENTRAGE DU TEXTE
                textStyle: {
                    color: sl.titleColor,
                    fontSize: sl.titleFontSize,
                    fontWeight: sl.titleFontWeight
                }
            });
        }

        if (sl.subtitleEnabled) {
            const baseTop = sl.titleOffsetY || 0;
            const titleHeight = sl.titleFontSize || 16;
            const gap = sl.titleItemGap || 5;
            const subtitleTop = baseTop + (titleHeight / 4) + gap;

            titleConfig.push({
                text: sl.subtitleText || '',
                left: `${sl.titleOffsetX}%`,  // ← MÊME POSITION HORIZONTALE QUE LE TITRE
                top: `${subtitleTop}%`,
                textAlign: 'center',  // ← CENTRAGE DU TEXTE
                textStyle: {
                    color: sl.subtitleColor,
                    fontSize: sl.subtitleFontSize,
                    fontWeight: sl.subtitleFontWeight
                }
            });
        }

        return titleConfig.length > 0 ? titleConfig : undefined;
    }


    private rawLineData: LineChartResponse | null = null;
    // Garder un snapshot des couches filtrées pour le template (évite les arrow funcs dans le HTML)
    filteredLayersSnapshot: Layer[] | null = null;



    // propriété pour la construction des axes X et Y pour les diagrammes en ligne, bar et bar goupés


    private buildAxes(chartType: string): any {
        const axesConfig: any = {};

        if (chartType === 'ligne') {
            const L = this.lineUI;

            axesConfig.xAxis = [{
                type: 'category',
                data: this.rawLineData?.x || [],
                boundaryGap: L.xBoundaryGap,
                show: L.xShow,
                axisLabel: {
                    color: L.xAxisLabelColor,
                    fontSize: L.xAxisLabelSize,
                    rotate: L.xAxisRotate
                },
                // Nouveau: Label de l'axe X
                name: L.xAxisLabel.show ? L.xAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: L.xAxisLabel.offset,
                nameTextStyle: {
                    color: L.xAxisLabel.color,
                    fontSize: L.xAxisLabel.fontSize,
                    fontWeight: L.xAxisLabel.fontWeight
                },
                axisLine: { lineStyle: { color: this.isDarkMode ? '#c7c7c7' : '#666666' } },
                axisTick: { show: true }
            }];

            axesConfig.yAxis = [{
                type: 'value',
                show: L.yShow,
                axisLabel: {
                    color: L.yAxisLabelColor,
                    fontSize: L.yAxisLabelSize
                },
                // Nouveau: Label de l'axe Y
                name: L.yAxisLabel.show ? L.yAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: L.yAxisLabel.offset,
                nameTextStyle: {
                    color: L.yAxisLabel.color,
                    fontSize: L.yAxisLabel.fontSize,
                    fontWeight: L.yAxisLabel.fontWeight
                },
                // Rotation pour le label Y si vertical
                ...(L.yAxisLabel.vertical && {
                    nameRotate: 90
                }),
                axisLine: { lineStyle: { color: this.isDarkMode ? '#c7c7c7' : '#666666' } },
                splitLine: {
                    show: L.ySplitLineShow,
                    lineStyle: {
                        color: this.isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
                    }
                }
            }];

        } else if (chartType === 'bar' || chartType === 'bar_groupé') {
            const B = this.barUI;

            axesConfig.xAxis = [{
                type: 'category',
                data: this.getBarXAxisData(chartType),
                show: B.xShow,
                axisLabel: {
                    color: B.xAxisLabelColor,
                    fontSize: B.xAxisLabelSize,
                    rotate: B.xAxisRotate
                },
                // Nouveau: Label de l'axe X
                name: B.xAxisLabel.show ? B.xAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: B.xAxisLabel.offset,
                nameTextStyle: {
                    color: B.xAxisLabel.color,
                    fontSize: B.xAxisLabel.fontSize,
                    fontWeight: B.xAxisLabel.fontWeight
                },
                axisLine: { lineStyle: { color: this.isDarkMode ? '#c7c7c7' : '#666666' } },
                axisTick: { show: true, alignWithLabel: true }
            }];

            axesConfig.yAxis = [{
                type: 'value',
                show: B.yShow,
                axisLabel: {
                    color: B.yAxisLabelColor,
                    fontSize: B.yAxisLabelSize
                },
                // Nouveau: Label de l'axe Y
                name: B.yAxisLabel.show ? B.yAxisLabel.text : undefined,
                nameLocation: 'middle',
                nameGap: B.yAxisLabel.offset,
                nameTextStyle: {
                    color: B.yAxisLabel.color,
                    fontSize: B.yAxisLabel.fontSize,
                    fontWeight: B.yAxisLabel.fontWeight
                },
                // Rotation pour le label Y si vertical
                ...(B.yAxisLabel.vertical && {
                    nameRotate: 90
                }),
                axisLine: { lineStyle: { color: this.isDarkMode ? '#c7c7c7' : '#666666' } },
                splitLine: {
                    show: B.ySplitLineShow,
                    lineStyle: {
                        color: this.isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
                    }
                }
            }];
        }

        return axesConfig;
    }

    // Méthode helper pour récupérer les données de l'axe X pour les barres
    private getBarXAxisData(chartType: string): string[] {
        if (chartType === 'bar') {
            return this.rawChartData?.map((item: any) => item.name) || [];
        } else if (chartType === 'bar_groupé') {
            return this.rawChartData?.[0]?.slice(1) || [];
        }
        return [];
    }

    //========== Groupage des données du diagramme en ligne========

    lineGroupByMode: 'x' | 'series' = 'x';

    private refreshLineLegendFromData(): void {
        if (!this.rawLineData) return;
        const isMulti = this.selectedLayersCount > 1;

        // Pour la légende latérale (celle qui sert au groupage),
        // on expose les séries (mode 'series') ou les X (mode 'x')
        const names = (isMulti && this.lineGroupByMode === 'series')
            ? (this.rawLineData.series ?? []).map(s => s.name)
            : (this.rawLineData.x ?? []).map(x => String(x));

        this.updateLegend(names);
    }

    // change de mode (radios) -> on rafraîchit la liste à grouper + le graphe
    onLineGroupModeChange(): void {
        if (this.selectedChartType !== 'ligne' || !this.rawLineData) return;
        const isMulti = this.isMultiLayer;
        const names = (isMulti && this.lineGroupByMode === 'series')
            ? (this.rawLineData.series ?? []).map(s => s.name)
            : (this.rawLineData.x ?? []);
        this.updateLegend(names as any);
        this.applyLegendChanges();
    }

    // Agrège les séries (sum élément par élément) selon les groupes crées
    private aggregateLineBySeries(data: LineChartResponse): LineChartResponse {
        const memberToGroup = new Map<string, string>();
        this.categoryGroups.forEach(g => g.members.forEach(m => memberToGroup.set(m, g.name)));

        const seriesMap = new Map<string, number[]>();
        for (const s of data.series) {
            const target = memberToGroup.get(s.name) || s.name;
            if (!seriesMap.has(target)) seriesMap.set(target, new Array(s.data.length).fill(0));
            const acc = seriesMap.get(target)!;
            s.data.forEach((v, i) => acc[i] += Number(v) || 0);
        }
        const series = Array.from(seriesMap.entries()).map(([name, arr]) => ({ name, data: arr }));
        return { x: data.x.slice(), series };
    }

    // Agrège par X (les labels X appartenant à un groupe sont fusionnés)
    private aggregateLineByX(data: LineChartResponse): LineChartResponse {
        const memberToGroup = new Map<string, string>();
        this.categoryGroups.forEach(g => g.members.forEach(m => memberToGroup.set(m, g.name)));

        const xTargets = data.x.map(x => memberToGroup.get(String(x)) || String(x));
        const xUnique = Array.from(new Set(xTargets));
        const idxByTarget = new Map(xUnique.map((n, i) => [n, i]));

        const series = data.series.map(s => {
            const acc = new Array(xUnique.length).fill(0);
            s.data.forEach((v, i) => {
                const t = xTargets[i];
                const k = idxByTarget.get(t)!;
                acc[k] += Number(v) || 0;
            });
            return { name: s.name, data: acc };
        });

        return { x: xUnique, series };
    }



    // =========fin du groupage des categories du diagramme en ligne===//



    // Compteurs / indicateurs utilisés dans le template (toujours sans arrow functions)
    get visibleSelectedCount(): number {
        const src = this.filteredLayersSnapshot ?? this.allLayers;
        return src.filter(l => l.visible).length;
    }
    get isMultiLayer(): boolean {
        return this.allLayers.filter(l => l.visible).length > 1;
    }
    get isSingleOrZeroLayer(): boolean {
        return !this.isMultiLayer;
    }

    //   ==========logique de configuration et d'exportation du json des diagramme prédefinis==///
    // verification de la configuration des graphiques predefinis

    public get isCurrentConfigValid(): boolean {
        switch (this.selectedChartType) {
            case 'pie':
            case 'bar':
                return !!(this.selectedLayerId && this.categoryColumn && this.valueColumn);

            case 'bar_groupé':
                const selectedLayers = this.allLayers.filter(l => l.visible);
                return !!(
                    selectedLayers.length >= 2 &&
                    this.areLayersCompatible &&
                    this.dimensionColumnBar &&
                    this.categoryColumnBar &&
                    this.valueColumnBar
                );

            case 'ligne':
                const layers = this.allLayers.filter(l => l.visible);
                return !!(
                    layers.length > 0 &&
                    this.dimensionColumnLine &&
                    this.valueColumnLine
                );

            default:
                return false;
        }
    }


    private lastGeneratedChartConfig: any = null;  // propriété pour garder les configuration en memoire

    // mappé les options pour sauvegarder dans le json.

    private _buildAndStoreCurrentConfig(): void {
        if (!this.isCurrentConfigValid) {
            this.lastGeneratedChartConfig = null;
            return;
        }

        let config: any;

        if (this.selectedChartType === 'pie' || this.selectedChartType === 'bar') {
            config = {
                tableName: this.selectedLayerId!,
                categoryColumn: this.categoryColumn!,
                valueColumn: this.valueColumn!,
                includeNulls: this.includeNullsPie,
                unspecifiedLabel: this.unspecifiedLabelPie,
                useSelection: this.useSpatialFilter,
                geomColumn: 'geom',

                options: {
                    ...(this.selectedChartType === 'pie' ? this.pieUI : this.barUI),
                    // mappage darkmode et pattern
                    isDarkMode: this.isDarkMode,
                    useDecalPattern: this.useDecalPattern
                }
            };
        } else if (this.selectedChartType === 'bar_groupé') {
            config = {
                tableNames: this.allLayers.filter(l => l.visible).map(l => l.id),
                dimensionColumn: this.dimensionColumnBar!,
                categoryColumn: this.categoryColumnBar!,
                valueColumn: this.valueColumnBar!,
                includeNulls: this.includeNullsBarGrouped,

                options: {
                    ...this.barUI,
                    // mappage darkmode et pattern
                    isDarkMode: this.isDarkMode,
                    useDecalPattern: this.useDecalPattern
                }
            };
        } else if (this.selectedChartType === 'ligne') {

            const tableNames = this.allLayers.filter(l => l.visible).map(l => l.id);
            config = {
                type: 'ligne',
                tables: tableNames.length > 1 ? tableNames : [this.selectedLayerId],
                xColumn: this.dimensionColumnLine,
                valueColumn: this.valueColumnLine,
                seriesColumn: this.seriesColumnLine ?? null,
                includeNulls: this.includeNullsLine,

                options: {
                    ...this.lineUI,
                    // mappage darkmode et pattern
                    isDarkMode: this.isDarkMode,
                    useDecalPattern: this.useDecalPattern
                }
            };
        }

        if (config) {
            config.colorScheme = this.legendCategories.map(({ name, color }) => ({ name, color })); //stocker les parametres de couleurs
            config.categoryGroups = this.categoryGroups.map(({ name, members, color }) => ({ name, members, color }));
            // On mappe les alias du tableau, s'ils existent
            config.columnAliases = this.tableColumnAliases;

            this.lastGeneratedChartConfig = JSON.parse(JSON.stringify(config));
        } else {
            this.lastGeneratedChartConfig = null;
        }
    }

    //=======FIn logique de configuration et d'exportation du json des diagramme prédefinis==//

    /** Debug logging */
    private DEBUG = true; // passe à false pour couper tous les logs

    private log = {
        group: (label: string) => this.DEBUG && console.group(`[ModalGraphic] ${label}`),
        groupCollapsed: (label: string) => this.DEBUG && console.groupCollapsed(`[ModalGraphic] ${label}`),
        end: () => this.DEBUG && console.groupEnd(),
        info: (...a: any[]) => this.DEBUG && console.log('[ModalGraphic]', ...a),
        warn: (...a: any[]) => this.DEBUG && console.warn('[ModalGraphic]', ...a),
        error: (...a: any[]) => this.DEBUG && console.error('[ModalGraphic]', ...a),
        table: (data: any) => this.DEBUG && console.table(data),
    };

    // ====================================================================
    // SECTION : CONSTRUCTOR & ngOnInit
    // ====================================================================

    constructor(
        public dialogRef: MatDialogRef<ModalGraphicComponent>,
        private layerService: LayerService,
        private apiService: ApiService,
        private dialog: MatDialog,
        private prefApi: GraphicPrefineServiceApi
    ) {

        this.dialogRef.disableClose = true; // Empêche la fermeture via clic extérieur et touche Échap
        console.log('[ModalGraphic] CONSTRUCTOR: Initialisation du composant.');
        this.filteredLayers$ = this.searchTerm$.pipe(
            map(term => {
                if (!term) {
                    console.log('[ModalGraphic] Filtre vide, retour de toutes les couches.');
                    return this.allLayers;
                }
                const filtered = this.allLayers.filter(layer => layer.name.toLowerCase().includes(term.toLowerCase()));
                console.log(`[ModalGraphic] Filtre appliqué: "${term}", résultats: ${filtered.length}`);
                return filtered;
            })
        );
    }





    ngOnInit(): void {


        console.log('[ModalGraphic] NG_ON_INIT: Récupération des couches depuis LayerService...');
        this.allLayers = this.layerService.getLayers();
        console.log(`[ModalGraphic] NG_ON_INIT: ${this.allLayers.length} couche(s) trouvée(s).`);



        this.searchTerm$.next('');
        if (this.allLayers.length > 0) {
            this.selectedLayerId = this.allLayers[0].id;
            console.log(`[ModalGraphic] NG_ON_INIT: Couche par défaut sélectionnée: ${this.selectedLayerId}`);
            this.onLayerSelectionChange(this.selectedLayerId);
        }
        this.filteredLayers$.subscribe(list => (this.filteredLayersSnapshot = list));
    }

    // ====================================================================
    // SECTION : MÉTHODES DE GESTION D'ÉVÉNEMENTS
    // ====================================================================


    // recherche ou filtrage d'une table dans l'accordeon couche
    onSearchTermChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        console.log(`[ModalGraphic] onSearchTermChange: "${input.value}"`);
        this.searchTerm$.next(input.value);
    }

    // gerer les changement de graphique ligne,bar, pie etc.
    onChartTypeChange(newValue: string): void {
        this.log.group('onChartTypeChange');
        this.log.info('-> nouveau type =', newValue);

        this.selectedChartType = newValue;

        this.resetFieldSelections();
        this.availableFields = [];
        this.chartOptions = null;

        const count = this.selectedLayersCount;
        this.log.info('couches visibles =', count, 'selectedLayerId =', this.selectedLayerId);

        if (this.selectedChartType === 'bar_groupé') {
            this.log.info('branch: bar_groupé (multi-couches requis)');
            if (count >= 2) {
                this.log.info('OK: >=2 couches, validation compatibilité…');
                this.onMultiLayerSelectionChange();
            } else {
                this.areLayersCompatible = false;
                this.compatibilityError = 'Veuillez sélectionner au moins deux couches.';
                this.log.warn('KO: moins de 2 couches ->', this.compatibilityError);
            }

        } else if (this.selectedChartType === 'ligne') {
            this.log.info('branch: ligne (mono OU multi)');
            if (count >= 2) {
                this.lineGroupByMode = (this.selectedLayersCount > 1) ? 'series' : 'x';
                this.log.info('>=2 couches -> onMultiLayerSelectionChange()');
                this.onMultiLayerSelectionChange();
            } else if (this.selectedLayerId) {
                this.log.info('1 couche -> onLayerSelectionChange(', this.selectedLayerId, ')');
                this.onLayerSelectionChange(this.selectedLayerId);
            } else {
                this.log.warn('Aucune couche sélectionnée pour "ligne".');
            }

        } else if (this.selectedLayerId && (this.selectedChartType === 'pie' || this.selectedChartType === 'bar')) {
            this.log.info('branch: pie/bar (mono-couche) -> onLayerSelectionChange(', this.selectedLayerId, ')');
            this.onLayerSelectionChange(this.selectedLayerId);

        } else {
            this.log.warn('branch: autre / configuration incomplète');
        }

        this.log.end();
    }


    onLayerSelectionChange(layerId: string): void {
        console.log(`[ModalGraphic] onLayerSelectionChange: layerId="${layerId}"`);
        this.isFieldsLoading = true;
        this.availableFields = [];
        this.resetFieldSelections();
        console.time('[ModalGraphic] Chargement colonnes');
        this.apiService.getColumns(layerId).subscribe(columns => {
            console.timeEnd('[ModalGraphic] Chargement colonnes');
            console.log(`[ModalGraphic] Colonnes reçues: ${columns.length}`);
            this.availableFields = columns;
            this.isFieldsLoading = false;
        });
    }
    // Methode de selection multicouche==
    onMultiLayerSelectionChange(): void {
        this.log.group('onMultiLayerSelectionChange');

        const selectedLayers = this.allLayers.filter(l => l.visible);
        const selectedTableNames = selectedLayers.map(l => l.id);
        const needTwo = (this.selectedChartType === 'bar_groupé');

        this.log.info('type =', this.selectedChartType, 'needTwo =', needTwo);
        this.log.info('couches sélectionnées:', selectedTableNames);
        this.log.table(selectedLayers.map(l => ({ id: l.id, name: l.name, visible: l.visible })));

        this.resetFieldSelections();
        this.availableFields = [];
        this.areLayersCompatible = false;
        this.compatibilityError = null;

        // n’imposer 2 couches que pour bar_groupé
        if (needTwo && selectedTableNames.length < 2) {
            this.compatibilityError = 'Veuillez sélectionner au moins deux couches.';
            this.log.warn('KO:', this.compatibilityError);
            this.log.end();
            return;
        }

        // Cas 1 couche (autorisé pour "ligne")
        if (selectedTableNames.length === 1) {
            const only = selectedLayers[0];

            this.lineGroupByMode = 'x';

            this.log.info('1 couche (OK pour "ligne"), chargement colonnes de', only.id);
            this.isValidationLoading = true;
            this.apiService.getColumns(only.id).subscribe({
                next: cols => {
                    this.availableFields = cols;
                    this.areLayersCompatible = true; // OK pour une seule couche
                    this.isValidationLoading = false;
                    this.log.info('Colonnes reçues (mono-couche):', cols.length);
                    this.log.table(cols);
                },
                error: err => {
                    this.isValidationLoading = false;
                    this.log.error('Erreur getColumns(mono-couche):', err);
                },
                complete: () => this.log.end()
            });
            return;
        }

        // Cas >=2 couches : valider la compatibilité
        this.log.info('>=2 couches, validation compatibilité…');
        this.lineGroupByMode = 'series';

        this.isValidationLoading = true;
        const columnRequests = selectedLayers.map(layer => this.apiService.getColumns(layer.id));

        forkJoin(columnRequests).subscribe({
            next: results => {
                const normalize = (arr: any[]) => arr.slice().sort((a, b) => a.name.localeCompare(b.name));
                const firstStructure = JSON.stringify(normalize(results[0]));
                const allSame = results.every(res => JSON.stringify(normalize(res)) === firstStructure);

                if (allSame) {
                    this.areLayersCompatible = true;
                    this.availableFields = results[0];
                    this.log.info('✅ Compatibilité OK. Colonnes disponibles =', this.availableFields.length);
                    this.log.table(this.availableFields);
                } else {
                    this.areLayersCompatible = false;
                    this.compatibilityError = "Les couches sélectionnées n'ont pas la même structure.";
                    this.log.warn('❌ Compatibilité KO:', this.compatibilityError);
                    results.forEach((cols, i) => {
                        this.log.info(`- Structure [${selectedTableNames[i]}]:`, JSON.stringify(normalize(cols)));
                    });
                }
            },
            error: err => {
                this.log.error('Erreur forkJoin(getColumns[]):', err);
            },
            complete: () => {
                this.isValidationLoading = false;
                this.log.end();
            }
        });
    }


    generateChart(): void {
        console.log(`[ModalGraphic] generateChart: Type="${this.selectedChartType}", useSpatialFilter=${this.useSpatialFilter}`);
        console.log(`[ModalGraphic] generateChart: Type="${this.selectedChartType}"`);
        // mis  à jour du snapshot
        this._buildAndStoreCurrentConfig();

        if (!this.lastGeneratedChartConfig) {
            console.error("Configuration invalide, impossible de générer le graphique.");
            return;
        }

        if (this.selectedChartType === 'pie' || this.selectedChartType === 'bar') {
            if (!this.selectedLayerId || !this.categoryColumn || !this.valueColumn) {
                console.error("[ModalGraphic] Configuration incomplète pour le graphique.");
                return;
            }

            const config: PieChartConfig = {
                tableName: this.selectedLayerId!,
                categoryColumn: this.categoryColumn!,
                valueColumn: this.valueColumn!,
                includeNulls: this.includeNullsPie,
                unspecifiedLabel: this.unspecifiedLabelPie,
                useSelection: this.useSpatialFilter,  // ⬅ ENVOI DU FLAG
                geomColumn: 'geom',
                options: this.selectedChartType === 'pie' ? this.pieUI : this.barUI
            };
            this.lastGeneratedChartConfig = JSON.parse(JSON.stringify(config));
            //saugarder les dernieres config

            console.log('[ModalGraphic] Configuration PIE:', config);

            const timer = '[ModalGraphic] PIE';
            console.time(timer);
            console.log('[ModalGraphic] Requête API PIE (useSelection=%s)', this.useSpatialFilter);

            this.apiService.getPieChartData(config, this.useSpatialFilter).subscribe({
                next: (rows: any[]) => {
                    console.timeEnd(timer);
                    console.log('[Pie] rows (aperçu):', JSON.stringify(rows?.slice?.(0, 5) ?? rows, null, 2));
                    this.rawChartData = rows;
                    this.updateLegend(rows.map((r: any) => r.name));
                    this.applyLegendChanges();
                },
                error: (e: any) => {
                    console.timeEnd(timer);
                    console.error('[Pie] Erreur API:', e);
                }
            });


        } else if (this.selectedChartType === 'bar_groupé') {
            const tableNames = this.allLayers.filter(l => l.visible).map(l => l.id);
            if (!this.areLayersCompatible || !this.dimensionColumnBar || !this.categoryColumnBar || !this.valueColumnBar) {
                console.error("[ModalGraphic] Configuration incomplète pour le graphique en barres groupées.");
                return;
            }


            const config: BarGroupedChartConfig = {
                tableNames,
                dimensionColumn: this.dimensionColumnBar!,
                categoryColumn: this.categoryColumnBar!,
                valueColumn: this.valueColumnBar!,
                includeNulls: this.includeNullsBarGrouped,
                useSelection: this.useSpatialFilter,
                geomColumn: 'geom',
                options: this.barUI
            };
            this.lastGeneratedChartConfig = JSON.parse(JSON.stringify(config)); //saugarder les dernieres config

            this.apiService.getBarGroupedChartData(config).subscribe({
                next: (matrix) => {
                    console.timeEnd('[ModalGraphic] API getBarGroupedChartData');
                    this.rawChartData = matrix;
                    const categories = matrix.slice(1).map(r => r[0]);
                    this.updateLegend(categories);
                    this.applyLegendChanges();
                },
                error: (err) => {
                    console.timeEnd('[ModalGraphic] API getBarGroupedChartData');
                    console.error('[BarGrouped] Erreur API:', err);
                    if (err?.status === 404) {
                        // TODO: afficher un toast/snackbar “Aucune donnée avec ce filtre”
                    }
                }
            });

        } else if (this.selectedChartType === 'ligne') {
            console.group('[Line] generateChart');

            const selectedIds = this.allLayers.filter(l => l.visible).map(l => l.id);
            const isMulti = selectedIds.length > 1;

            // valeurs par défaut...
            if (!this.dimensionColumnLine && this.availableFields?.length) {
                this.dimensionColumnLine = this.availableFields[0].name;
            }
            if (!this.valueColumnLine && this.numericFields?.length) {
                this.valueColumnLine = this.numericFields[0].name;
            }
            if (isMulti && !this.seriesColumnLine && this.textFields?.length) {
                this.seriesColumnLine = this.textFields[0].name;
            }

            if (!this.dimensionColumnLine || !this.valueColumnLine) {
                console.warn('[Line] Champs X/Y manquants.');
                console.groupEnd();
                return;
            }

            const payload: LineChartConfig = isMulti
                ? {
                    tableNames: selectedIds,
                    xColumn: this.dimensionColumnLine!,
                    valueColumn: this.valueColumnLine!,
                    seriesColumn: this.seriesColumnLine || null,
                    includeNulls: this.includeNullsLine,
                    useSelection: this.useSpatialFilter,
                    options: this.lineUI
                }
                : {
                    tableName: selectedIds[0] ?? this.selectedLayerId!,
                    xColumn: this.dimensionColumnLine!,
                    valueColumn: this.valueColumnLine!,
                    seriesColumn: null,
                    includeNulls: this.includeNullsLine,
                    useSelection: this.useSpatialFilter
                };

            this.lastGeneratedChartConfig = JSON.parse(JSON.stringify(payload)); //saugarder les dernieres config

            this.apiService.getLineChartData(payload).subscribe({
                next: (resp) => {
                    this.rawLineData = resp;

                    // 🔸 IMPORTANT :
                    // - mono-couche -> légende = catégories X (cochables)
                    // - multi-couches -> légende = séries (comme avant)
                    const legendSeed = isMulti
                        ? (resp.series ?? []).map(s => s.name)
                        : (resp.x ?? []).map(x => String(x));

                    this.updateLegend(legendSeed);
                    if (this.selectedLayersCount <= 1) {
                        const monoColor = this.legendCategories[0]?.color ?? '#5470c6';
                        this.legendCategories = this.legendCategories.map(c => ({ ...c, color: monoColor }));
                    }

                    this.applyLegendChanges();
                },
                error: (err) => console.error('[Line] Erreur API:', err),
                complete: () => console.groupEnd()
            });





        }





    }

    //========Methode pour la gestion du redimensionnement et positionnement du contenair graphique==
    onChartInit(ec: any) {
        this.echartsSvc = ec;
    }

    // ====================================================================
    // SECTION : MÉTHODES de configuration des graphiques
    // ====================================================================

    applyLegendChanges(): void {

        // ddonnées requétés dans le tableau des données    
        console.group('[ModalGraphic] applyLegendChanges');
        this.tableColumns = []; // Reset table
        this.tableColumnAliases = {};
        this.tableData = []; // Reset table


        // On valide les données par type (évite de bloquer "ligne")
        if (this.selectedChartType === 'pie' || this.selectedChartType === 'bar' || this.selectedChartType === 'bar_groupé') {
            if (!this.rawChartData || this.rawChartData.length === 0) {
                console.warn('[ModalGraphic] Aucune donnée à afficher pour', this.selectedChartType);
                console.groupEnd();
                return;
            }
        }
        if (this.selectedChartType === 'ligne') {
            if (!this.rawLineData || !this.rawLineData.series || this.rawLineData.series.length === 0) {
                console.warn('[ModalGraphic] Aucune donnée à afficher pour ligne.');
                console.groupEnd();
                return;
            }
        }




        let uiSettings: any;
        switch (this.selectedChartType) {
            case 'pie':
                uiSettings = this.pieUI;
                break;
            case 'bar':
            case 'bar_groupé':
                uiSettings = this.barUI;
                break;
            case 'ligne':
                uiSettings = this.lineUI;
                break;
            default:
                uiSettings = this.pieUI;
        }



        let titleConfigFinal: any = undefined;
        if (uiSettings && uiSettings.titleEnabled) {
            titleConfigFinal = {
                // Propriétés de base du bloc
                text: uiSettings.titleText || '',
                left: `${uiSettings.titleOffsetX}%`,
                top: `${uiSettings.titleOffsetY}%`,
                itemGap: uiSettings.titleItemGap, // Fonctionnera maintenant
                textAlign: uiSettings.titleTextAlign,

                // Style du texte principal
                textStyle: {
                    color: uiSettings.titleColor,
                    fontSize: uiSettings.titleFontSize,
                    fontWeight: uiSettings.titleFontWeight
                },

                // Ajout du sous-titre s'il est activé
                subtext: uiSettings.subtitleEnabled ? uiSettings.subtitleText || '' : undefined,
                subtextStyle: uiSettings.subtitleEnabled ? {
                    color: uiSettings.subtitleColor,
                    fontSize: uiSettings.subtitleFontSize,
                    fontWeight: uiSettings.subtitleFontWeight
                } : undefined,

                // Ajout du cadre (s'appliquera à l'ensemble)
                backgroundColor: uiSettings.titleBoxEnabled ? uiSettings.titleBoxBg : 'transparent',
                borderColor: uiSettings.titleBoxEnabled ? uiSettings.titleBoxBorderColor : undefined,
                borderWidth: uiSettings.titleBoxEnabled ? uiSettings.titleBoxBorderWidth : undefined,
                borderRadius: uiSettings.titleBoxEnabled ? uiSettings.titleBoxBorderRadius : undefined,
                padding: uiSettings.titleBoxEnabled ? uiSettings.titleBoxPadding : undefined,
            };
        }

        const visibleCategories = this.legendCategories.filter(cat => cat.visible);
        const visibleCategoryNames = new Set(visibleCategories.map(cat => cat.name));

        // --- couleurs selon dark mode
        const bg = this.isDarkMode ? '#121212' : '#ffffff';
        const textCol = this.isDarkMode ? '#e0e0e0' : '#333333';
        const axisCol = this.isDarkMode ? '#c7c7c7' : '#666666';
        const gridCol = this.isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

        // ============ Titre / Sous-titre  ============
        const sPie = this.pieUI;

        // ============ Légende de base pour PIE  ============
        const legendDataAll = this.legendCategories.map(c => c.name);
        const legendSelectedMap: Record<string, boolean> = {};
        this.legendCategories.forEach(c => { legendSelectedMap[c.name] = !!c.visible; });



        let newOptions: EChartsOption | null = null;

        // ============================================================
        // PIE
        // ============================================================
        if (this.selectedChartType === 'pie') {
            const s = this.pieUI;
            const inner = Math.max(0, Math.min(s.innerRadius, 99));
            const outer = Math.max(1, Math.min(s.outerRadius, 100));
            const innerSafe = Math.min(inner, outer - 1);
            const radius = s.isDonut ? [`${innerSafe}%`, `${outer}%`] : `${outer}%`;

            // Agrégation par groupes
            const memberToGroup = new Map<string, string>();
            this.categoryGroups.forEach(g => g.members.forEach(m => memberToGroup.set(m, g.name)));
            const aggregated = new Map<string, number>();
            for (const item of this.rawChartData) {
                const target = memberToGroup.get(item.name) || item.name;
                const val = Number(item.value ?? 0);
                aggregated.set(target, (aggregated.get(target) || 0) + val);
            }
            const aggregatedData = Array.from(aggregated.entries()).map(([name, value]) => ({
                name, value: Math.round((value + Number.EPSILON) * 100) / 100
            }));
            const visibleSet = new Set(this.legendCategories.filter(c => c.visible).map(c => c.name));
            const filteredData = aggregatedData.filter(d => visibleSet.has(d.name));

            // Légende formatée {name}/{value}/{percent}
            const valueMap = new Map<string, number>();
            let totalSum = 0;
            for (const d of aggregatedData) {
                const v = Number(d.value) || 0;
                valueMap.set(d.name, v);
                totalSum += v;
            }


            //  DÉBUT DE LA MODIFICATION DE LA LOGIQUE DE LÉGENDE 
            let dynamicFontSize = s.legendTextSize;
            // Si le redimensionnement auto est activé et que l'instance du graphique existe
            if (s.legendResponsiveSizing && this.echartsSvc) {
                const width = this.echartsSvc.getWidth();
                if (width > 0) {
                    // Formule simple pour calculer la taille de police (minimum 10px, maximum 16px)
                    dynamicFontSize = Math.max(10, Math.min(16, Math.floor(width / 45)));
                }
            }



            const center: [string, string] = [`${s.centerX}%`, `${s.centerY}%`];
            const legendConfigPie = s.legendShow ? {
                type: s.legendType,
                orient: s.legendOrient,
                left: `${s.legendPosX}%`,
                top: `${s.legendPosY}%`,
                itemWidth: s.legendItemWidth,
                itemHeight: s.legendItemHeight,
                itemGap: s.legendItemGap,
                icon: s.legendIcon === 'auto' ? undefined : s.legendIcon,
                textStyle: {
                    color: s.legendTextColor,
                    fontSize: dynamicFontSize,
                    fontWeight: s.legendTextWeight
                },
                selectedMode: s.legendSelectedMode,
                data: this.legendCategories.map(c => c.name),
                selected: this.legendCategories.reduce((acc, c) => (acc[c.name] = !!c.visible, acc), {} as Record<string, boolean>),
                formatter: (name: string) => {
                    const tpl = (s.legendFormatter || '{name}').trim();
                    const v = valueMap.get(name) ?? 0;
                    const pct = totalSum > 0 ? (v / totalSum) * 100 : 0;
                    return tpl
                        .replace('{name}', name)
                        .replace('{value}', this.formatNumberForLegend(v))
                        .replace('{percent}', pct.toFixed(s.tooltipDecimalsPercent ?? 2));
                }

            } : { show: false };




            newOptions = {
                backgroundColor: bg,
                textStyle: { color: textCol },
                title: titleConfigFinal,
                legend: legendConfigPie,
                tooltip: s.tooltipEnabled ? {
                    trigger: 'item',
                    triggerOn: s.tooltipTriggerOn,
                    confine: s.tooltipConfine,
                    formatter: (p: any) => {
                        const fmt = (num: number, decimals: number, thousands: boolean) => {
                            const n = Number(num ?? 0);
                            const fixed = n.toFixed(decimals);
                            if (!thousands) return fixed;
                            const parts = fixed.split('.');
                            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                            return parts.join('.');
                        };
                        const val = Number(p.value ?? 0);
                        const pct = Number(p.percent ?? 0);
                        const valStr = fmt(val, s.tooltipDecimalsValue, s.tooltipThousandsSep);
                        const pctStr = s.tooltipShowPercent ? ` (${pct.toFixed(s.tooltipDecimalsPercent)}%)` : '';
                        const unitStr = s.tooltipUnit ? ` ${s.tooltipUnit}` : '';
                        return `${p.marker} ${p.name}: ${valStr}${unitStr}${pctStr}`;
                    },
                    backgroundColor: s.tooltipBg,
                    borderColor: s.tooltipBorderColor,
                    borderWidth: s.tooltipBorderWidth,
                    padding: s.tooltipPadding,
                    textStyle: {
                        color: s.tooltipTextColor,
                        fontSize: s.tooltipFontSize,
                        fontWeight: s.tooltipFontWeight
                    },
                    extraCssText: `
            border-radius: ${s.tooltipBorderRadius}px;
            box-shadow: 0 2px ${s.tooltipShadowBlur}px ${s.tooltipShadowColor};
          `
                } : { show: false },
                series: [{
                    type: 'pie',
                    radius, center,
                    avoidLabelOverlap: s.avoidLabelOverlap,
                    roseType: s.roseType === false ? undefined : s.roseType,
                    selectedMode: s.selectedMode === false ? false : s.selectedMode,
                    selectedOffset: s.selectedOffset,
                    emphasis: {
                        scale: !!s.hoverAnimation,
                        scaleSize: s.emphasisScaleSize,
                        focus: s.emphasisFocus,
                        disabled: false,
                        itemStyle: { shadowBlur: s.emphasisShadowBlur, shadowColor: s.emphasisShadowColor },
                        label: { show: s.emphasisLabelShow, fontSize: s.emphasisLabelFontSize, fontWeight: s.emphasisLabelFontWeight },
                        labelLine: { show: s.labelPosition === 'outside' ? s.emphasisLabelLineShow : false }
                    },
                    startAngle: s.startAngle,
                    clockwise: s.clockwise,
                    minAngle: s.minAngle,
                    stillShowZeroSum: s.stillShowZeroSum,
                    label: {
                        show: s.labelShow,
                        position: s.labelPosition,
                        align: s.labelPosition === 'inside' ? s.labelInsideAlign : undefined,
                        verticalAlign: s.labelPosition === 'inside' ? s.labelInsideVerticalAlign : undefined,
                        alignTo: s.labelPosition === 'outside'
                            ? (s.labelAlignTo === 'none' ? undefined : s.labelAlignTo)
                            : undefined,
                        edgeDistance: (s.labelPosition === 'outside' && s.labelAlignTo === 'edge') ? s.labelEdgeDistance : undefined,

                        formatter: (params: any) => {

                            let tpl = s.labelFormatter || '{b}';


                            tpl = tpl.replace('{b}', params.name || '');
                            tpl = tpl.replace('{c}', params.value ? this.formatNumberForLegend(params.value) : '0');
                            tpl = tpl.replace('{d}', params.percent?.toFixed(s.tooltipDecimalsPercent ?? 1) || '0');


                            if (!s.tooltipShowPercent) {

                                tpl = tpl.replace(/\s*\([^)]*%\)/g, '');
                            }

                            return tpl;
                        },
                        color: s.labelColor,
                        fontSize: s.labelFontSize,
                        fontWeight: s.labelFontWeight,
                        backgroundColor: s.labelBackgroundColor,
                        padding: s.labelPadding,
                        borderRadius: s.labelBorderRadius,
                        textShadowColor: s.labelTextShadowColor,
                        textShadowBlur: s.labelTextShadowBlur
                    },
                    labelLine: {
                        show: s.labelPosition === 'outside' ? (s.labelLineShow || s.emphasisLabelLineShow) : false,
                        length: s.labelLineLength, length2: s.labelLineLength2
                    },
                    itemStyle: {
                        borderColor: s.itemBorderColor, borderWidth: s.itemBorderWidth, borderRadius: s.itemBorderRadius
                    },
                    labelLayout: s.useLabelLayout ? ((params: any) => {
                        if (s.labelPosition === 'inside') {
                            const x = params.labelRect.x + s.labelInsideOffsetX;
                            const y = params.labelRect.y + s.labelInsideOffsetY;
                            return { x, y, align: s.labelInsideAlign, verticalAlign: s.labelInsideVerticalAlign };
                        }
                        const cx = params.rect.x + params.rect.width / 2;
                        const labelCenterX = params.labelRect.x + params.labelRect.width / 2;
                        const isLeft = labelCenterX < cx;
                        let pts = params.labelLinePoints ? params.labelLinePoints.slice() : null;
                        if (pts && pts.length === 3) pts[2][0] += isLeft ? -s.labelLayoutOffsetX : s.labelLayoutOffsetX;
                        return { align: isLeft ? 'right' : 'left', verticalAlign: 'middle', labelLinePoints: pts || params.labelLinePoints };
                    }) : undefined,
                    data: filteredData.map((item, idx) => {
                        const legendItem = this.legendCategories.find(cat => cat.name === item.name);
                        const color = legendItem?.color;
                        const itemStyle: any = { color };
                        if (this.useDecalPattern) itemStyle.decal = this.getDecal(idx);
                        return { ...item, itemStyle };
                    })
                }]
            };
            console.log('[ModalGraphic] Options Pie construites.');
        }


        // ============================================================
        // LIGNE 
        // ============================================================

        else if (this.selectedChartType === 'ligne') {
            console.log('[Line] applyLegendChanges...');
            const titleLine = this.buildLineTitleConfig();
            const original = this.rawLineData!;
            const sl = this.lineUI;
            const sPie = this.pieUI; // pour tooltip
            const isMulti = this.selectedLayersCount > 1;
            const axesConfig = this.buildAxes('ligne');

            // 1) Appliquer le groupage (si des groupes existent)
            let toPlot: LineChartResponse = original;
            if (!isMulti) {
                const monoColor = this.legendCategories[0]?.color ?? '#5470c6';
                this.legendCategories = this.legendCategories.map(c => ({ ...c, color: monoColor }));
            }
            if (this.isSingleOrZeroLayer) {
                // mono-couche -> groupage par X (si des groupes existent)
                if (this.categoryGroups.length) {
                    toPlot = this.aggregateLineByX(original);
                }
            } else {
                // multi-couches -> selon le radio 'series' | 'x'
                if (this.categoryGroups.length) {
                    toPlot = (this.lineGroupByMode === 'series')
                        ? this.aggregateLineBySeries(original)
                        : this.aggregateLineByX(original);
                }
            }



            //     NOMS affichés dépendent du mode de groupage
            const legendNamesForChart = (isMulti && this.lineGroupByMode === 'series')
                ? toPlot.series.map(s => s.name)         // séries éventuellement agrégées
                : (original.series ?? []).map(s => s.name); // sinon, légende = séries “brutes”
            const legendConfigLine = this.buildLegendForLine(legendNamesForChart);

            //  Espace pour la légende si elle est en haut
            const legendTopVal = legendConfigLine?.top ?? 'top';
            const legendNearTop =
                legendTopVal === 'top' ||
                legendTopVal === 0 ||
                (typeof legendTopVal === 'string' && legendTopVal.endsWith('%') && parseFloat(legendTopVal) <= 10);
            const gridTopFinal = legendNearTop ? Math.max(sl.gridTop, 56) : sl.gridTop;



            const visibleSet = new Set(this.legendCategories.filter(c => c.visible).map(c => c.name));
            let seriesForChart = toPlot.series;

            if (isMulti && this.lineGroupByMode === 'series') {
                // filtre par la légende de l’accordéon
                seriesForChart = toPlot.series.filter(s => visibleSet.has(s.name));

                // synchronise l’ordre + les couleurs de la légende avec les séries tracées
                const order = seriesForChart.map(s => s.name);
                this.syncLegendToSeriesOrder(order);
            }

            // MONO-couche : on filtre les X (inchangé)
            if (!isMulti && this.categoryGroups.length === 0) {
                const visibleSet = new Set(this.legendCategories.filter(c => c.visible).map(c => c.name));
                const keptIdx: number[] = [];
                const keptX: string[] = [];

                original.x.forEach((x, i) => {
                    const name = String(x);
                    if (visibleSet.has(name)) {
                        keptIdx.push(i);
                        keptX.push(name);
                    }
                });

                toPlot = {
                    x: keptX,
                    series: (original.series ?? []).map(s => ({
                        name: s.name,
                        data: keptIdx.map(i => s.data[i])
                    }))
                };
            }


            // 5) Séries ECharts
            const series = seriesForChart.map((serie, i) => {

                const colorItem = (isMulti && this.lineGroupByMode === 'series')
                    ? this.legendCategories.find(c => c.name === serie.name)?.color
                    : undefined;

                const itemStyle: any = colorItem ? { color: colorItem } : {};
                const lineStyle: any = { width: sl.lineWidth, type: sl.lineType };
                const areaStyle =
                    sl.areaOpacity > 0
                        ? { opacity: sl.areaOpacity, ...(this.useDecalPattern ? { decal: this.getDecal(i) } : {}) }
                        : undefined;

                return {
                    name: serie.name,
                    type: 'line',
                    data: serie.data,
                    smooth: sl.smooth,
                    showSymbol: sl.showSymbol, symbol: sl.symbol, symbolSize: sl.symbolSize,
                    connectNulls: sl.connectNulls,
                    step: sl.step,
                    stack: sl.stack || undefined,
                    itemStyle, lineStyle, areaStyle,
                    label: {
                        show: sl.labelShow,
                        position: sl.labelPosition,
                        // formatter: sl.labelFormatter,
                        color: sl.labelColor, fontSize: sl.labelFontSize, fontWeight: sl.labelFontWeight,
                        formatter: (params: any) => {
                            const value = params.value as number;
                            // Si la valeur est 0, on retourne une chaîne vide pour ne rien afficher
                            if (value === 0) {
                                return '';
                            }
                            // Sinon, on applique le formatage demandé par l'utilisateur
                            const tpl = sl.labelFormatter || '{c}';
                            let formatted = tpl.replace('{c}', this.formatBarValue(value));
                            formatted = formatted.replace('{b}', params.name || '');
                            return formatted;
                        }
                    },
                    emphasis: {
                        focus: sl.emphasisFocus,
                        itemStyle: { shadowBlur: sl.emphasisShadowBlur, shadowColor: sl.emphasisShadowColor },
                        label: { show: sl.emphasisLabelShow }
                    },
                    animation: sl.animation,
                    animationDuration: sl.animationDuration,
                    animationEasing: sl.animationEasing
                } as SeriesOption;
            });

            // 6) Tooltip, DataZoom, etc. (inchangé sauf data = toPlot.x)
            const tooltip = sPie.tooltipEnabled ? {
                trigger: 'axis',
                axisPointer: { type: 'line' },
                triggerOn: sPie.tooltipTriggerOn,
                confine: sPie.tooltipConfine,
                formatter: (params: any) => {
                    const arr = Array.isArray(params) ? params : [params];
                    const head = arr[0]?.axisValueLabel || arr[0]?.name || '';
                    const fmt = (num: number, dec: number, thou: boolean) => {
                        const n = Number(num ?? 0);
                        const fixed = n.toFixed(dec);
                        if (!thou) return fixed;
                        const parts = fixed.split('.');
                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                        return parts.join('.');
                    };
                    const lines = arr.map((p: any) => {
                        const valStr = fmt(Number(p.value ?? 0), sPie.tooltipDecimalsValue, sPie.tooltipThousandsSep);
                        const unitStr = sPie.tooltipUnit ? ` ${sPie.tooltipUnit}` : '';
                        return `${p.marker} ${p.seriesName}: ${valStr}${unitStr}`;
                    });
                    return `${head}<br/>${lines.join('<br/>')}`;
                },
                backgroundColor: sPie.tooltipBg,
                borderColor: sPie.tooltipBorderColor,
                borderWidth: sPie.tooltipBorderWidth,
                padding: sPie.tooltipPadding,
                textStyle: { color: sPie.tooltipTextColor, fontSize: sPie.tooltipFontSize, fontWeight: sPie.tooltipFontWeight },
                extraCssText: `border-radius:${sPie.tooltipBorderRadius}px; box-shadow:0 2px ${sPie.tooltipShadowBlur}px ${sPie.tooltipShadowColor};`
            } : { show: false };

            // Dans la section LIGNE, cherchez la partie DataZoom
            const dz: any[] = [];
            if (sl.dataZoomInside) dz.push({
                type: 'inside',
                xAxisIndex: [0],
                start: sl.dataZoomStart,
                end: sl.dataZoomEnd
            });
            if (sl.dataZoomSlider) dz.push({
                type: 'slider',
                xAxisIndex: [0],
                start: sl.dataZoomStart,
                end: sl.dataZoomEnd,
                ...(sl.dzUseXY ? {
                    left: `${sl.dzOffsetX}%`,  // ← TOUJOURS EN %
                    top: `${sl.dzOffsetY}%`,   // ← TOUJOURS EN %
                    ...(sl.dzWidth != null ? { width: `${sl.dzWidth}%` } : {}),     // ← TOUJOURS EN %
                    ...(sl.dzHeight != null ? { height: `${sl.dzHeight}%` } : {})   // ← TOUJOURS EN %
                } : {})
            });

            const boundaryGap = Array.isArray(sl.xBoundaryGap)
                ? (sl.xBoundaryGap as [number | string, number | string])
                : sl.xBoundaryGap;

            // 7) Options finales (xAxis.data = toPlot.x)
            newOptions = {
                backgroundColor: this.isDarkMode ? '#121212' : '#ffffff',
                textStyle: { color: this.isDarkMode ? '#e0e0e0' : '#333333' },
                legend: legendConfigLine,
                tooltip,
                title: titleLine,
                ...axesConfig,
                grid: {
                    left: `${sl.gridLeft}%`,
                    right: `${sl.gridRight}%`,
                    top: `${sl.gridTop}%`,
                    bottom: `${sl.gridBottom}%`, containLabel: sl.gridContainLabel
                },

                xAxis: axesConfig.xAxis,
                yAxis: axesConfig.yAxis,
                dataZoom: dz,
                series
            } as EChartsOption;

            console.log('[Line] Options construites (mode =', this.lineGroupByMode, ')');
        }




        // ============================================================
        // BAR (mono-série agrégée)
        // ============================================================
        else if (this.selectedChartType === 'bar') {
            const sb = this.barUI;
            const axesConfig = this.buildAxes(this.selectedChartType);

            // agrégation par groupes -> catégories = X, une seule série
            const memberToGroupBar = new Map<string, string>();
            this.categoryGroups.forEach(g => g.members.forEach(m => memberToGroupBar.set(m, g.name)));

            const aggregatedBar = new Map<string, number>();
            for (const item of this.rawChartData) {
                const target = memberToGroupBar.get(item.name) || item.name;
                const val = Number(item.value ?? 0);
                aggregatedBar.set(target, (aggregatedBar.get(target) || 0) + val);
            }
            const aggregatedDataBar = Array.from(aggregatedBar.entries()).map(([name, value]) => ({
                name, value: Math.round((value + Number.EPSILON) * 100) / 100
            }));
            const visibleSetBar = new Set(this.legendCategories.filter(c => c.visible).map(c => c.name));
            const filteredDataBar = aggregatedDataBar.filter(d => visibleSetBar.has(d.name));

            const autoWidth = !(sb.barWidthPx > 0);


            // === LÉGENDE (catégories) ===
            // Map nom -> valeur (après agrégation & filtrage visibles)
            const valueMapBar = new Map<string, number>(filteredDataBar.map(d => [d.name, d.value]));

            // Noms à afficher (ordre de l’axe X)
            const xNames = filteredDataBar.map(d => d.name);





            // Tooltip simple (Bar)
            const tooltipBar: any = this.barTooltipEnabled
                ? {
                    trigger: 'item',
                    triggerOn: 'click',
                    confine: true,
                    formatter: (p: any) => {
                        // p.name = label X (catégorie), p.seriesName = idem (on a 1 série par catégorie)
                        const cat = p.name || p.seriesName || '';
                        const val = Number(p.value ?? 0);
                        return `${p.marker} ${cat}: ${this.formatBarValue(val)}`;
                    }
                }
                : { show: false };


            // Construit une légende “catégories” (supporte {name} et {value})
            let legendConfigBar: any = this.buildLegendForBar(xNames, valueMapBar) || {
                show: true,
                type: 'plain',
                orient: 'horizontal',
                top: 'top',
                left: 'center',
                data: xNames,
                textStyle: { color: this.isDarkMode ? '#e0e0e0' : '#333' },
                selectedMode: false
            };

            // Si la légende est en haut, on libère un peu de place
            const legendTopVal = legendConfigBar.top ?? 'top';
            const legendNearTop =
                legendTopVal === 'top' ||
                legendTopVal === 0 ||
                (typeof legendTopVal === 'string' && legendTopVal.endsWith('%') && parseFloat(legendTopVal) <= 10);
            const gridTopFinal = legendNearTop ? Math.max(sb.gridTop, 56) : sb.gridTop;


            // === SÉRIES : 1 série par catégorie, mais EMPILÉES pour centrer la barre ===
            const series: SeriesOption[] = xNames.map((name, i): SeriesOption => {
                const v = valueMapBar.get(name) ?? 0;
                const data = xNames.map(n => (n === name ? v : 0));

                const color = this.legendCategories.find(c => c.name === name)?.color;
                const itemStyle: any = { color, borderRadius: sb.barBorderRadius };
                if (this.useDecalPattern) itemStyle.decal = this.getDecal(i);

                return {
                    name,
                    type: 'bar',
                    stack: '__cat__',                      // ← aligne toutes les séries au centre
                    data,
                    barWidth: sb.barWidthPx > 0 ? sb.barWidthPx : undefined,
                    barGap: sb.barGap,                     // ex: '30%' (écart entre séries empilées: peu d’effet mais OK)
                    barCategoryGap: sb.barCategoryGap,
                    label: {
                        show: sb.labelShow,
                        position: sb.labelPosition,

                        color: sb.labelColor,
                        fontSize: sb.labelFontSize,
                        fontWeight: sb.labelFontWeight,
                        formatter: (params: any) => {
                            const value = params.value as number;
                            // Si la valeur est 0, on retourne une chaîne vide pour ne rien afficher
                            if (value === 0) {
                                return '';
                            }
                            // Sinon, on applique le formatage demandé par l'utilisateur
                            const tpl = sb.labelFormatter || '{c}';
                            let formatted = tpl.replace('{c}', this.formatBarValue(value));
                            formatted = formatted.replace('{b}', params.name || '');
                            return formatted;
                        }
                    },
                    emphasis: {
                        focus: this.barUI.emphasisFocus,
                        itemStyle: { shadowBlur: this.barUI.emphasisShadowBlur, shadowColor: this.barUI.emphasisShadowColor },
                        label: { show: this.barUI.emphasisLabelShow }
                    },
                    animation: sb.animation,
                    animationDuration: sb.animationDuration,
                    animationEasing: sb.animationEasing,
                    itemStyle
                } as SeriesOption;
            });


            // === OPTIONS ===
            newOptions = {
                backgroundColor: bg,
                textStyle: { color: textCol },
                title: this.buildBarTitleConfig(),
                legend: legendConfigBar,
                tooltip: tooltipBar,
                ...axesConfig,

                grid: {
                    left: `${sb.gridLeft}%`,
                    right: `${sb.gridRight}%`,
                    top: `${sb.gridTop}%`,
                    bottom: `${sb.gridBottom}%`,
                    containLabel: sb.gridContainLabel
                },


                xAxis: axesConfig.xAxis,
                yAxis: axesConfig.yAxis,

                dataZoom: [
                    ...(sb.dataZoomInside ? [{ type: 'inside', xAxisIndex: [0], start: sb.dataZoomStart, end: sb.dataZoomEnd }] : []),
                    ...(sb.dataZoomSlider ? [{
                        type: 'slider', xAxisIndex: [0], start: sb.dataZoomStart, end: sb.dataZoomEnd,
                        ...(sb.dzUseXY ? {
                            left: sb.dzPosUnit === '%' ? `${sb.dzOffsetX}%` : sb.dzOffsetX,
                            top: sb.dzPosUnit === '%' ? `${sb.dzOffsetY}%` : sb.dzOffsetY,
                            ...(sb.dzWidth != null ? { width: sb.dzPosUnit === '%' ? `${sb.dzWidth}%` : sb.dzWidth } : {}),
                            ...(sb.dzHeight != null ? { height: sb.dzPosUnit === '%' ? `${sb.dzHeight}%` : sb.dzHeight } : {})
                        } : {})
                    }] : [])
                ],
                series
            };


            console.log('[ModalGraphic] Options Bar construites.');
        }





        // ============================================================
        // BAR_GROUPÉ (multi-séries) — utilise buildLegendForBar()
        // ============================================================
        else if (this.selectedChartType === 'bar_groupé') {
            const sb = this.barUI;
            const axesConfig = this.buildAxes(this.selectedChartType);

            const sourceData = this.rawChartData;
            if (!sourceData || sourceData.length < 2) {
                console.warn('[ModalGraphic] bar_groupé: données insuffisantes.');
                console.groupEnd();
                return;
            }

            // Dimensions (xAxis) et lignes (catégories d’origine)
            const dimensions: string[] = sourceData[0].slice(1);
            const rows: any[][] = sourceData.slice(1);
            console.log(`[ModalGraphic] bar_groupé: dimensions=${dimensions.length}, lignes=${rows.length}`);

            // Groupement des catégories (qui deviennent des séries)
            const memberToGroup = new Map<string, string>();
            this.categoryGroups.forEach(g => g.members.forEach(m => memberToGroup.set(m, g.name)));

            // Agrège par série cible (groupe ou catégorie d’origine)
            const seriesMap = new Map<string, number[]>();
            for (const row of rows) {
                const origName = String(row[0]);
                const targetName = memberToGroup.get(origName) || origName;
                const vals = row.slice(1).map((v: any) => Number(v) || 0);
                if (!seriesMap.has(targetName)) seriesMap.set(targetName, new Array(vals.length).fill(0));
                const acc = seriesMap.get(targetName)!;
                for (let i = 0; i < vals.length; i++) acc[i] += vals[i];
            }

            // Filtre selon visibilité (légende latérale)
            const visibleSet = new Set(this.legendCategories.filter(c => c.visible).map(c => c.name));
            const aggregatedSeries = Array.from(seriesMap.entries()).filter(([name]) => visibleSet.has(name));

            // Noms de série visibles → pour la légende ECharts
            const legendNames = aggregatedSeries.map(([name]) => name);
            const totalsBySeries = new Map<string, number>(
                aggregatedSeries.map(([name, values]) => [
                    name,
                    values.reduce((a, b) => a + (Number(b) || 0), 0)
                ])
            );
            const legendConfigForGrouped = this.buildLegendForBar(legendNames, totalsBySeries);
            console.log('[bar_groupé] legendNames:', legendNames, 'legendCfg:', legendConfigForGrouped);
            const legendFinal = legendConfigForGrouped ?? { show: true, top: 'top' };



            const tooltipGrouped: any = this.barTooltipEnabled
                ? {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' as const },
                    triggerOn: 'click',
                    confine: true,
                    formatter: (params: any) => {
                        const arr = Array.isArray(params) ? params : [params];
                        const head = arr[0]?.axisValueLabel || arr[0]?.name || '';
                        const lines = arr.map((p: any) => {
                            const val = Number(p.value ?? 0);
                            return `${p.marker} ${p.seriesName}: ${this.formatBarValue(val)}`;
                        });
                        return `${head}<br/>${lines.join('<br/>')}`;
                    }
                }
                : { show: false };





            // Séries
            const series: SeriesOption[] = aggregatedSeries.map(([name, values], i): SeriesOption => {
                const color = this.legendCategories.find(c => c.name === name)?.color;
                const itemStyle: any = { color, borderRadius: sb.barBorderRadius };
                if (this.useDecalPattern) itemStyle.decal = this.getDecal(i);

                return {
                    name,
                    type: 'bar',
                    data: values,
                    itemStyle,
                    barWidth: sb.barWidthPx > 0 ? sb.barWidthPx : undefined,
                    barGap: sb.barGap,
                    barCategoryGap: sb.barCategoryGap,
                    label: {
                        show: sb.labelShow,
                        position: sb.labelPosition,
                        // formatter: sb.labelFormatter,
                        color: sb.labelColor,
                        fontSize: sb.labelFontSize,
                        fontWeight: sb.labelFontWeight,
                        formatter: (params: any) => {
                            const value = params.value as number;
                            // Si la valeur est 0, on retourne une chaîne vide pour ne rien afficher
                            if (value === 0) {
                                return '';
                            }
                            // Sinon, on applique le formatage demandé par l'utilisateur
                            const tpl = sb.labelFormatter || '{c}';
                            let formatted = tpl.replace('{c}', this.formatBarValue(value));
                            formatted = formatted.replace('{b}', params.name || '');
                            return formatted;
                        }
                    },
                    emphasis: {
                        focus: sb.emphasisFocus,
                        itemStyle: { shadowBlur: sb.emphasisShadowBlur, shadowColor: sb.emphasisShadowColor },
                        label: { show: sb.emphasisLabelShow }
                    },
                    animation: sb.animation,
                    animationDuration: sb.animationDuration,
                    animationEasing: sb.animationEasing
                } as SeriesOption;
            });

            newOptions = {
                backgroundColor: bg,
                textStyle: { color: textCol },
                title: this.buildBarTitleConfig(),
                legend: legendFinal,  // ← utilise la méthode de classe
                tooltip: tooltipGrouped,
                ...axesConfig,

                grid: {
                    left: `${sb.gridLeft}%`,
                    right: `${sb.gridRight}%`,
                    top: `${sb.gridTop}%`,
                    bottom: `${sb.gridBottom}%`,
                    containLabel: sb.gridContainLabel
                },

                xAxis: axesConfig.xAxis,
                yAxis: axesConfig.yAxis,

                dataZoom: [
                    ...(sb.dataZoomInside ? [{
                        type: 'inside', xAxisIndex: [0], start: sb.dataZoomStart, end: sb.dataZoomEnd
                    }] : []),
                    ...(sb.dataZoomSlider ? [{
                        type: 'slider', xAxisIndex: [0], start: sb.dataZoomStart, end: sb.dataZoomEnd,
                        ...(sb.dzUseXY ? {
                            left: sb.dzPosUnit === '%' ? `${sb.dzOffsetX}%` : sb.dzOffsetX,
                            top: sb.dzPosUnit === '%' ? `${sb.dzOffsetY}%` : sb.dzOffsetY,
                            ...(sb.dzWidth != null ? { width: sb.dzPosUnit === '%' ? `${sb.dzWidth}%` : sb.dzWidth } : {}),
                            ...(sb.dzHeight != null ? { height: sb.dzPosUnit === '%' ? `${sb.dzHeight}%` : sb.dzHeight } : {})
                        } : {})
                    }] : [])
                ],
                series
            } as EChartsOption;

            // console.log('[ModalGraphic] Options Bar Groupé construites.');

        }



        // ---  Préparation des données pour le tableau ---
        try {
            if (this.selectedChartType === 'pie' || this.selectedChartType === 'bar') {
                if (this.rawChartData && this.rawChartData.length > 0) {
                    this.tableColumns = ['Catégorie', 'Valeurs'];
                    this.tableColumnAliases = {
                        'Catégorie': 'Catégorie',
                        'Valeurs': 'Valeurs'
                    };
                    this.tableData = this.rawChartData.map(item => ({
                        'Catégorie': item.name,
                        'Valeurs': item.value
                    }));
                }
            } else if (this.selectedChartType === 'bar_groupé') {
                if (this.rawChartData && this.rawChartData.length > 1) {
                    this.tableColumns = ['Dimension', 'Catégorie', 'Valeur'];
                    this.tableColumnAliases = {
                        'Dimension': 'Dimension',
                        'Catégorie': 'Catégorie',
                        'Valeur': 'Valeur'
                    };
                    const dimensions = this.rawChartData[0].slice(1);
                    const categoriesData = this.rawChartData.slice(1);
                    this.tableData = [];
                    categoriesData.forEach(row => {
                        const categorie = row[0];
                        dimensions.forEach((dimension: string, index: number) => {
                            this.tableData.push({
                                'Dimension': dimension,
                                'Catégorie': categorie,
                                'Valeur': row[index + 1] // +1 car la première colonne est la catégorie
                            });
                        });
                    });
                }
            } else if (this.selectedChartType === 'ligne') {
                if (this.rawLineData && this.rawLineData.x && this.rawLineData.series) {
                    const hasSeriesColumn = this.seriesColumnLine || this.rawLineData.series.length > 1; // Vérifie si on a utilisé la colonne série ou si plusieurs séries sont retournées

                    if (hasSeriesColumn) {
                        this.tableColumns = ['Dimension', 'Catégorie', 'Valeur'];
                        this.tableColumnAliases = {
                            'Dimension': 'Dimension',
                            'Catégorie': 'Catégorie',
                            'Valeur': 'Valeur'
                        };
                        this.tableData = [];
                        this.rawLineData.series.forEach(serie => {
                            this.rawLineData?.x.forEach((dim, index) => {
                                this.tableData.push({
                                    'Dimension': dim,
                                    'Catégorie': serie.name,
                                    'Valeur': serie.data[index]
                                });
                            });
                        });
                    } else {
                        // Cas simple : X et Y seulement
                        this.tableColumns = ['Catégorie', 'Valeur'];
                        this.tableColumnAliases = {
                            'Catégorie': 'Catégorie',
                            'Valeur': 'Valeur'
                        };
                        // Assumant qu'il y a au moins une série si hasSeriesColumn est faux
                        const firstSeries = this.rawLineData.series[0];
                        this.tableData = this.rawLineData.x.map((cat, index) => ({
                            'Catégorie': cat,
                            'Valeur': firstSeries.data[index]
                        }));
                    }
                }
            }
        } catch (error) {
            console.error("Erreur lors de la préparation des données pour le tableau :", error);
            this.tableColumns = ['Erreur'];
            this.tableData = [{ 'Erreur': 'Impossible de formater les données.' }];
        }

        // --- FIN : Préparation des données pour le tableau ---

        this.chartOptions = newOptions;

        this.chartOptions = newOptions;
        console.log('[ModalGraphic] chartOptions mises à jour.', this.chartOptions);
        console.groupEnd();
        console.log('%c CONFIGURATION QUI FONCTIONNE (MODALE) :', 'color: green; font-weight: bold;', this.chartOptions);
    }




    updateLegend(categoryNames: string[]): void {
        // Reset des groupements à chaque nouvelle génération de données
        this.categoryGroups = [];
        this.groupSelection.clear();
        this.newGroupName = '';
        this.newGroupColor = '#919191ff';

        console.log(`[ModalGraphic] updateLegend: ${categoryNames.length} catégories.`);
        this.legendCategories = categoryNames.map((name, index) => ({
            name: String(name),
            color: this.DEFAULT_COLORS[index % this.DEFAULT_COLORS.length], // ← même palette, réutilisée
            visible: true
        }));
    }


    toggleCategoryForGroup(name: string): void {
        if (this.groupSelection.has(name)) {
            this.groupSelection.delete(name);
        } else {
            this.groupSelection.add(name);
        }
        console.log('[Group] Sélection actuelle:', Array.from(this.groupSelection));
    }

    createGroupFromSelection(): void {
        const members = Array.from(this.groupSelection);
        const name = (this.newGroupName || '').trim();
        if (members.length < 2) {
            console.warn('[Group] Au moins 2 catégories sont requises.');
            return;
        }
        if (!name) {
            console.warn('[Group] Nom de groupe requis.');
            return;
        }
        const nameExists = this.legendCategories.some(c => c.name === name) ||
            this.categoryGroups.some(g => g.name === name);
        if (nameExists) {
            console.warn('[Group] Un groupe ou une catégorie porte déjà ce nom.');
            return;
        }

        const color = this.newGroupColor || '#9e9e9e';
        const group: CategoryGroup = { name, members, color, visible: true };
        this.categoryGroups.push(group);

        // Ajouter le groupe à la légende
        this.legendCategories.push({ name, color, visible: true });

        // Masquer les membres dans la légende pour éviter le doublon visuel/filtrage
        this.legendCategories = this.legendCategories.map(c =>
            members.includes(c.name) ? { ...c, visible: false } : c
        );

        // Reset sélection & champ nom
        this.groupSelection.clear();
        this.newGroupName = '';
        console.log('[Group] Créé:', group);

        this.applyLegendChanges();
    }

    removeGroup(index: number): void {
        const g = this.categoryGroups[index];
        if (!g) return;

        // Supprimer le groupe de la liste
        this.categoryGroups.splice(index, 1);

        // Enlever le groupe de la légende
        this.legendCategories = this.legendCategories.filter(c => c.name !== g.name);

        // Rendre les membres de nouveau visibles dans la légende
        this.legendCategories = this.legendCategories.map(c =>
            g.members.includes(c.name) ? { ...c, visible: true } : c
        );

        console.log('[Group] Supprimé:', g);
        this.applyLegendChanges();
    }


    validateFieldSelections(): void {
        this.valueColumnError = null;
        if (this.valueColumnBar) {
            const field = this.availableFields.find(f => f.name === this.valueColumnBar);
            if (field && !['bigint', 'integer', 'numeric', 'double precision', 'real', 'smallint'].includes(field.type)) {
                this.valueColumnError = 'Ce champ doit être de type numérique.';
                console.warn(`[ModalGraphic] validateFieldSelections: Type invalide pour "${this.valueColumnBar}" (type=${field?.type}).`);
            } else {
                console.log('[ModalGraphic] validateFieldSelections: Type numérique valide.');
            }
        }
    }

    resetFieldSelections(): void {
        console.log('[ModalGraphic] resetFieldSelections: Remise à zéro des sélections et données.');
        this.categoryColumn = null;
        this.valueColumn = null;
        this.dimensionColumnBar = null;
        this.categoryColumnBar = null;
        this.valueColumnBar = null;
        this.valueColumnError = null;
        this.compatibilityError = null;
        this.legendCategories = [];
        this.rawChartData = [];
    }

    // generateur de dark mode et pattern

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        console.log('[Theme] Dark mode:', this.isDarkMode);
        this.applyLegendChanges();
    }

    toggleDecalPattern(): void {
        this.useDecalPattern = !this.useDecalPattern;
        console.log('[Pattern] Use decal:', this.useDecalPattern);
        this.applyLegendChanges();
    }

    // Petit générateur de motifs (decal) – renvoie un objet toléré par ECharts
    private getDecal(index: number): any {
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

    // onLineGroupModeChange(): void {
    //     this.applyLegendChanges();
    // }
    toggleSidebar(): void {
        this.isSidebarOpen = !this.isSidebarOpen;
        console.log(`[ModalGraphic] toggleSidebar: Barre latérale ${this.isSidebarOpen ? 'ouverte' : 'fermée'}.`);

        // On attend la fin de l'animation CSS (environ 300ms) pour redimensionner
        setTimeout(() => {
            if (this.echartsSvc) {
                this.echartsSvc.resize();
            }
        }, 300); // 300ms correspond à votre `transition: all 0.3s ease;`
    }


    close(): void {
        console.log('[ModalGraphic] close: Fermeture de la modale.');
        this.dialogRef.close();
    }

    filterToSelection(): void {
        console.log('[ModalGraphic] filterToSelection appelée - ancienne valeur:', this.useSpatialFilter);
        this.useSpatialFilter = true;
        console.log('[ModalGraphic] useSpatialFilter =', this.useSpatialFilter);

        // Régénère immédiatement le graphique avec le nouveau filtre
        this.generateChart();
    }





    openRegisterPreset() {
        this._buildAndStoreCurrentConfig();

        if (!this.lastGeneratedChartConfig) {
            console.error("Impossible d'enregistrer : la configuration est invalide.");
            return;
        }
        // 2. On récupère la configuration complète (avec les données ET les options visuelles).
        //    Il n'y a plus besoin de reconstruire l'objet config, on utilise la version déjà validée.
        const config = this.lastGeneratedChartConfig;
        const type = this.selectedChartType as PresetType;

        // 3. (Optionnel) On affiche dans la console l'objet exact qui sera envoyé pour l'enregistrement.
        console.log("Configuration complète envoyée pour l'enregistrement :", config);

        // 4. On ouvre la modale d'enregistrement en lui passant les bonnes données.
        this.dialog.open(RegisterPresetDialog, {
            width: '520px',
            data: { type, config } // On passe la configuration complète et sauvegardée.
        }).afterClosed().subscribe(created => {
            if (created) {
                console.log('[ModalGraphic] ✅ Preset créé avec succès :', created);
            }
        });
    }

}