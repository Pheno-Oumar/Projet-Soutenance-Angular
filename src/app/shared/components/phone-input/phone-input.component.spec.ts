import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneInputComponent } from './phone-input.component';

describe('PhoneInputComponent', () => {
  let component: PhoneInputComponent;
  let fixture: ComponentFixture<PhoneInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create PhoneInputComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should write value into internal state and format input element with national number', () => {
    component.writeValue('+22370000000');
    expect(component.inputRef?.nativeElement.value).toBe('70 00 00 00');
  });

  it('should support disabled state', () => {
    component.setDisabledState?.(true);
    expect(component.disabled).toBe(true);
  });
});
