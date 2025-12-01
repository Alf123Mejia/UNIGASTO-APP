import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { FinancialService } from '../../services/financial';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, Header, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  public financialService = inject(FinancialService); // CORRECCIÓN: public

  budget: number = 0;
  savingsGoal: number = 0;
  userName: string = '';
  profileImageSrc: string | null = null;

  ngOnInit() {
    this.budget = this.financialService.budget();
    this.savingsGoal = this.financialService.savingsGoal();
    this.profileImageSrc = this.financialService.profileImage();
    this.userName = this.financialService.userName();
  }

  saveSettings() {
    if (this.budget >= 0) this.financialService.setBudget(this.budget);
    if (this.savingsGoal >= 0) this.financialService.setSavingsGoal(this.savingsGoal);
    if (this.userName.trim()) this.financialService.setUserName(this.userName);
    alert('¡Configuración guardada correctamente!');
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImageSrc = e.target.result;
        this.financialService.setProfileImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('La imagen es demasiado pesada (Máx 2MB).');
    }
  }

  triggerFileInput() {
    document.getElementById('profile-upload')?.click();
  }
}