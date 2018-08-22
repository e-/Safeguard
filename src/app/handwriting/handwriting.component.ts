import { Component, OnInit } from '@angular/core';
import { Sketchable } from '../vis/renderers/sketchable';

@Component({
    selector: 'handwriting',
    templateUrl: './handwriting.component.html',
    styleUrls: ['./handwriting.component.scss']
})
export class HandwritingComponent implements OnInit {
    left = 500;
    top = 500;
    handwritingWidth = 200;
    handwritingHeight = 50;
    padding = 10;

    constructor() { }

    ngOnInit() {
    }

    show(nativeSvg:SVGSVGElement, sketchable:Sketchable, options: {minLeft?: number}) {
        let box = sketchable.getBoundingBox();
        let svgBox = nativeSvg.getBoundingClientRect();
        const parentBox = nativeSvg.parentElement.getBoundingClientRect();

        let left = svgBox.left - parentBox.left + box.x;
        let width = box.width;
        if(options.minLeft && options.minLeft < left) {
            width += left - options.minLeft;
            left = options.minLeft;
        }

        this.handwritingWidth = width + 2 * this.padding;
        this.handwritingHeight = box.height + 2 * this.padding;

        this.left = left - this.padding - 1;
        this.top = svgBox.top - parentBox.top + box.y - this.padding - 29;
    }

    hide() {

    }
}