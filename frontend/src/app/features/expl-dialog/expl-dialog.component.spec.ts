import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExplDialogComponent } from './expl-dialog.component';

describe('ExplDialogComponent', () => {
  let component: ExplDialogComponent;
  let fixture: ComponentFixture<ExplDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExplDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExplDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
