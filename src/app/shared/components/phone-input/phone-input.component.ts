import {
  AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import intlTelInput, { Iti } from 'intl-tel-input/intlTelInputWithUtils';
import { fr } from 'intl-tel-input/locale';

const COUNTRY_MAP: Record<string, string> = {
  'mali': 'ml',
  'côte d’ivoire': 'ci',
  'côte d\'ivoire': 'ci',
  'cote d\'ivoire': 'ci',
  'sénégal': 'sn',
  'senegal': 'sn',
  'burkina faso': 'bf',
  'burkina': 'bf',
  'guinée': 'gn',
  'guinee': 'gn',
  'niger': 'ne',
  'togo': 'tg',
  'bénin': 'bj',
  'benin': 'bj',
  'france': 'fr',
  'cameroun': 'cm',
  'gabon': 'ga',
  'congo': 'cg'
};

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor {
  @ViewChild('phoneInput', { static: false }) inputRef?: ElementRef<HTMLInputElement>;

  @Input() id = 'telephone';
  @Input() name = 'telephone';
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input() country = 'Mali';

  @Output() countryChange = new EventEmitter<string>();
  @Output() phoneNumberChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<boolean>();

  private iti?: Iti;
  private frenchRegionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
  private internalValue = '';

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.initIntlTelInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['country'] && !changes['country'].firstChange && this.iti) {
      this.syncCountryFromInput(this.country);
    }
    if (changes['disabled'] && this.iti) {
      this.iti.setDisabled(this.disabled);
    }
  }

  ngOnDestroy(): void {
    if (this.iti) {
      this.iti.destroy();
      this.iti = undefined;
    }
  }

  // --- ControlValueAccessor ---
  writeValue(value: string | null): void {
    this.internalValue = value || '';
    if (this.iti) {
      this.iti.setNumber(this.internalValue);
    } else if (this.inputRef?.nativeElement) {
      this.inputRef.nativeElement.value = this.internalValue;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.iti) {
      this.iti.setDisabled(isDisabled);
    }
  }

  private initIntlTelInput(): void {
    if (typeof window === 'undefined' || !this.inputRef?.nativeElement) {
      return;
    }

    try {
      const initialIso = this.resolveIsoCode(this.country) || 'ml';

      this.iti = intlTelInput(this.inputRef.nativeElement, {
        uiTranslations: fr,
        countryNameLocale: 'fr',
        initialCountry: initialIso as any,
        countryOrder: ['ml', 'ci', 'sn', 'bf', 'gn', 'ne', 'tg', 'bj', 'fr'],
        separateDialCode: true,
        strictMode: true,
        countrySearch: true
      });

      if (this.internalValue) {
        this.iti.setNumber(this.internalValue);
      }

      if (this.disabled) {
        this.iti.setDisabled(true);
      }

      // Initial country emission if needed
      const initialSelected = this.iti.getSelectedCountry();
      if (initialSelected?.iso2) {
        const countryName = this.formatCountryName(initialSelected.iso2);
        this.countryChange.emit(countryName);
      }

      // Listen to countrychange
      this.inputRef.nativeElement.addEventListener('countrychange', () => {
        const selected = this.iti?.getSelectedCountry();
        if (selected?.iso2) {
          const countryName = this.formatCountryName(selected.iso2);
          this.countryChange.emit(countryName);
        }
        this.handleInputChange();
      });

      // Listen to input & blur
      this.inputRef.nativeElement.addEventListener('input', () => {
        this.handleInputChange();
      });

      this.inputRef.nativeElement.addEventListener('blur', () => {
        this.onTouched();
      });
    } catch (err) {
      console.warn('Could not initialize intl-tel-input:', err);
    }
  }

  private handleInputChange(): void {
    if (!this.iti) {
      return;
    }

    const fullNumber = this.iti.getNumber() || this.inputRef?.nativeElement.value || '';
    const isValid = this.iti.isValidNumber() ?? false;

    this.internalValue = fullNumber;
    this.onChange(fullNumber);
    this.phoneNumberChange.emit(fullNumber);
    this.validityChange.emit(isValid);
  }

  private syncCountryFromInput(countryName: string): void {
    if (!this.iti || !countryName) {
      return;
    }
    const iso = this.resolveIsoCode(countryName);
    if (iso && this.iti.getSelectedCountry()?.iso2 !== iso) {
      this.iti.setSelectedCountry(iso as any);
    }
  }

  private resolveIsoCode(countryName: string): string | null {
    if (!countryName) {
      return null;
    }
    const normalized = countryName.trim().toLowerCase();
    return COUNTRY_MAP[normalized] || null;
  }

  private formatCountryName(iso2: string): string {
    try {
      return this.frenchRegionNames.of(iso2.toUpperCase()) || iso2.toUpperCase();
    } catch {
      return iso2.toUpperCase();
    }
  }
}
