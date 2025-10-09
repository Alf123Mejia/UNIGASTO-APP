import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTransaction } from './add-transaction';

describe('AddTransaction', () => {
  let component: AddTransaction;
  let fixture: ComponentFixture<AddTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTransaction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddTransaction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
  