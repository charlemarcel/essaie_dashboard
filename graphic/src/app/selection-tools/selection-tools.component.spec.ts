import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectionToolsComponent } from './selection-tools.component';

describe('SelectionToolsComponent', () => {
  let component: SelectionToolsComponent;
  let fixture: ComponentFixture<SelectionToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectionToolsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectionToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
