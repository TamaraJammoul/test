import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ApplicationHttpClient } from './http-app-client';
import { demandeReparations } from 'src/app/entities/demands';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// export interface DemandeData {
//   items: demandeReparations [],
//   meta: {
//     itemCount: number,
//     totalItems: number,
//     itemsPerPage: number,
//     totalPages: number,
//     currentPage: number
//   },
//   links: {
//     first: string,
//     previous: string,
//     next: string,
//     last: string
//   }
// }
@Injectable({
  providedIn: 'root',
})
export class DemandereparationService {

  dataRow: any;

  //private api: string = 'demande';
  private api: string = `${environment.baseUrl}/demande`;

  constructor(private HttpClient: ApplicationHttpClient,
    private http: HttpClient
  ) { }

  // findeAll(page: number, size: number): Observable<DemandeData> {
  //   let params = new HttpClient();
  //   params = params.append('page', String(page));
  //   params = params.append('limit', String(size))
  //   return this.http.get('demands', {params})
  //   .pipe(
  //     map((demandeData: DemandeData) => userData),
  //     catchError(err => throwError(err))
  //   )
  // }

  // ??????
  public getDistributeurDemande(): Observable<any> {
    return this.HttpClient.get(this.api + '/distributeur');
  }

  public getDemandesByDistributeur(id: number): Observable<any> {
    return this.HttpClient.get(this.api + '/distributeur/' + id);
  }

  public getDemandereparation(): Observable<any> {
    return this.HttpClient.get(this.api);
  }

  // public getDemandePro(): Observable<any> {
  //   return this.HttpClient.get(this.api + '/distributeur');
  // }

  public getById(id: string): Observable<any> {
    return this.HttpClient.get(this.api + '/' + id)
      .pipe(map((e: any) => ({ ...e, anomaliesIds: e.demandeToAnomalie?.map((d: any) => d.anomalieId) }))) //to add all anomalies array (choose anomalie id)
  }

  public getByDistributeur(email: string): Observable<any> {
    return this.HttpClient.get(this.api + '/distributeur/email/' + email)
      .pipe(map(data => data));
  }


  public addDemandereparation(demande: demandeReparations): Observable<any> {
    return this.HttpClient.post(this.api, demande);
  }

  public addDemandePro(demande: demandeReparations): Observable<any> {

    const formData = new FormData();

    Object.keys(demande).forEach((key) => {
      if (key === 'images') {
        demande.images?.forEach((item: any) =>
          formData.append('images', item)
        );
      }
      else if (key === 'bill') {
        demande.bill?.forEach((item: any) =>
          formData.append('bill', item)
        );
      } else {
        formData.append(key, this.getFormDataField(demande[key as keyof typeof demande]));
      }
    });

    return this.http.post(`${this.api}/create-professionnel`, formData);
  }

  getFormDataField(fieldValue: any) {
    if (typeof fieldValue === 'string') {
      return fieldValue;
    }
    return fieldValue;
  }

  public update(
    id: string,
    demande: Partial<demandeReparations>
  ): Observable<any> {
    return this.HttpClient.put(this.api + '/' + id + '/demande', demande);
  }

  public updateTraitement(
    id: string,
    demande: Partial<demandeReparations>
  ): Observable<any> {
    return this.HttpClient.put(this.api + '/' + id + '/traitement', demande);
  }

  public updateFicheReparation(
    id: string,
    demande: Partial<demandeReparations>
  ): Observable<any> {
    return this.HttpClient.put(
      this.api + '/' + id + '/fiche-reparation',
      demande
    );
  }

  public updateLivraison(
    id: string,
    demande: Partial<demandeReparations>
  ): Observable<any> {
    return this.HttpClient.put(this.api + '/' + id + '/livraison', demande);
  }

  public deleteDemandereparation(id: number): Observable<any> {
    return this.HttpClient.delete(this.api + '/' + id);
  }
}
