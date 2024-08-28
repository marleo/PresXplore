import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShotlistComponent } from './components/shotlist/shotlist.component';
import { AppComponent } from './app.component';
import { QueryComponent } from './components/query/query.component';

//'' is default route
const routes: Routes = [
  { path: '', redirectTo: 'query', pathMatch: 'full' }, // component: AppComponent
  { path: 'query', component: QueryComponent },
  { path: 'filesimilarity/:id/:id2/:id3', component: QueryComponent },
  { path: 'filesimilarity/:id/:id2/:id3/:page', component: QueryComponent },
  { path: 'video/:id', component: ShotlistComponent },
  { path: 'video/:id/:id2', component: ShotlistComponent }
];

// /login and /register etc.

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
