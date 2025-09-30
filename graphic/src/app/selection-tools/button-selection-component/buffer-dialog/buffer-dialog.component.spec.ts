import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BufferDialogComponent } from './buffer-dialog.component';

describe('BufferDialogComponent', () => {
  let component: BufferDialogComponent;
  let fixture: ComponentFixture<BufferDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BufferDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BufferDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
