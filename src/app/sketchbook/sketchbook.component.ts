import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';

import { Point } from '../vis/renderers/point';
import { Stroke } from '../vis/renderers/stroke';
import { HandwritingRecognitionService } from '../handwriting-recognition.service';

@Component({
    selector: 'sketchbook',
    templateUrl: './sketchbook.component.html',
    styleUrls: ['./sketchbook.component.css']
})
export class SketchbookComponent implements OnInit {
    @ViewChild('svg') svgRef: ElementRef;
    svg: d3.Selection<d3.BaseType, {}, null, undefined>;
    strokes:Stroke[] = [];
    line = d3.line<Point>().curve(d3.curveBasis).x(d => d.x).y(d => d.y);
    recognitionResult: string;

    constructor(private hand:HandwritingRecognitionService) { }

    renderStrokes() {
        let paths = this.svg
                .selectAll('path')
                .data(this.strokes)

        let pathsEnter = paths
            .enter()
            .append('path')
            .style('stroke', 'black')
            .style('fill', 'none');

        paths
            .merge(pathsEnter)
            .attr('d', (stroke: Stroke) => this.line(stroke.points));
    }

    ngOnInit() {
        let drag = d3.drag();
        this.svg = d3.select(this.svgRef.nativeElement);
        let svg = this.svg;
        let stroke:Stroke;

        drag.on('start', () => {
            stroke = new Stroke();
            this.strokes.push(stroke);
        });

        drag.on('drag', () => {
            let xy = d3.mouse(this.svgRef.nativeElement);
            let point = new Point(xy[0], xy[1], +new Date());

            stroke.addPoint(point);

            this.renderStrokes();
        });

        svg.call(drag);
    }

    recognize() {
        // let payload = { "xDPI": 96, "yDPI": 96, "width": 815, "height": 1153,
        // "contentType": "Math", "configuration": { "lang":"en_US", "text": { },
        // "export": { "jiix": { "strokes": false, "text": { "chars": false, "words": true } } } },
        // "strokeGroups": [
        //     { "strokes":[ {"x":[124,126,126,124,124],"y":[214,219,222,227,230],"t":[50708,50866,50882,50899,50916],"p":[0.5,0.7679404212893917,0.6761535882018319,0.7531128489300326,0.6761535882018319]}, {"x":[140,145,146,147,148,148,148],"y":[216,216,219,223,226,229,232],"t":[51059,51116,51132,51149,51166,51182,51199],"p":[0.5,0.7763932022500211,0.6831899108492184,0.7185264889882718,0.6831899108492184,0.6761535882018319,0.6761535882018319]}, {"x":[99,105,111,124,132,145,149,156,162,166,170],"y":[211,210,210,210,210,209,209,209,209,208,209],"t":[51428,51466,51483,51500,51517,51536,51549,51566,51583,51599,51616],"p":[0.5,0.7533674285440339,0.7665225987135362,0.639444872453601,0.7993507587287858,0.6389126863152722,0.7145158745241171,0.78472787299413,0.7665225987135362,0.7185264889882718,0.7185264889882718]}, {"x":[187,194,197,201,205,210,213],"y":[214,216,217,219,221,225,226],"t":[52903,52985,53002,53018,53035,53052,53068],"p":[0.5,0.7301832123591914,0.6831899108492184,0.7292125754002905,0.7292125754002905,0.774350629289587,0.6831899108492184]}, {"x":[206,206,201,199,197],"y":[208,215,224,229,233],"t":[53308,53368,53411,53435,53468],"p":[0.5,0.735424868893541,0.7246610743832567,0.7531128489300326,0.7292125754002905]}, {"x":[245,243,246,249,253,256,257,257,251,247,243,239,247,252,256,260,264,267,270],"y":[208,202,201,200,200,203,206,209,216,221,225,229,229,229,228,228,228,227,227],"t":[53931,54036,54053,54069,54087,54120,54135,54152,54170,54186,54204,54237,54319,54336,54353,54370,54387,54403,54420],"p":[0.5,0.7485133140634128,0.6831899108492184,0.6831899108492184,0.7145158745241171,0.7222966378316396,0.6831899108492184,0.6761535882018319,0.8133650328603405,0.774350629289587,0.7592733046045574,0.7592733046045574,0.7993507587287858,0.7436746598382117,0.7185264889882718,0.7145158745241171,0.7145158745241171,0.6831899108492184,0.6761535882018319]}, {"x":[275,281,287,293,298,301,297,294,290,287,284,281,277,277,284,289,297,300,302,300,297,294,290,287],"y":[198,199,198,197,196,195,195,195,196,197,198,201,205,208,210,211,211,212,215,220,222,225,227,228],"t":[54688,54740,54755,54770,54786,54819,54887,54904,54920,54937,54954,54971,55005,55053,55104,55120,55137,55153,55187,55204,55220,55237,55253,55270],"p":[0.5,0.7533674285440339,0.7681880209236327,0.7681880209236327,0.7461846839143089,0.6831899108492184,0.7145158745241171,0.6761535882018319,0.7185264889882718,0.6831899108492184,0.6831899108492184,0.7222966378316396,0.7592733046045574,0.6761535882018319,0.7891492414771674,0.7461846839143089,0.7993507587287858,0.6831899108492184,0.7007103955941203,0.7531128489300326,0.7007103955941203,0.7222966378316396,0.7292125754002905,0.6831899108492184]}, {"x":[316,325,328,330,329,326,322,320,325,328,331,335,338],"y":[175,171,171,175,179,183,188,191,191,191,191,191,192],"t":[55783,55921,55939,55971,55988,56006,56022,56055,56121,56138,56155,56172,56205],"p":[0.5,0.6861711007285003,0.6761535882018319,0.7292125754002905,0.7185264889882718,0.7436746598382117,0.774350629289587,0.7007103955941203,0.7436746598382117,0.6761535882018319,0.6761535882018319,0.7145158745241171,0.6831899108492184]}, {"x":[337,342,347,352,358,364,367],"y":[213,213,213,213,213,212,212],"t":[57351,57423,57440,57457,57474,57490,57507],"p":[0.5,0.7763932022500211,0.7436746598382117,0.7436746598382117,0.7665225987135362,0.7681880209236327,0.6761535882018319]}, {"x":[336,343,348,354,360,367],"y":[231,232,231,230,230,229],"t":[57690,57740,57757,57774,57790,57808],"p":[0.5,0.7340852051527506,0.7461846839143089,0.7681880209236327,0.7665225987135362,0.785875329883628]} ] } ] };


        this.hand.recognize(this.strokes).subscribe((result) =>{
            this.strokes = [];
            this.renderStrokes();
            console.log(result);
        })
    }

}
