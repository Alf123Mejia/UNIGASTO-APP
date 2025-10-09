import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavingsGoal } from './savings-goal';

describe('SavingsGoal', () => {
  let component: SavingsGoal;
  let fixture: ComponentFixture<SavingsGoal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavingsGoal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavingsGoal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
