import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CATALOGO_DEMOSTRACION } from '../../core/datos/catalogo';
import { ErrorApi, traducirError } from '../../core/http/errores';
import { LineaPedidoPeticion } from '../../core/modelos/pedidos';
import { LanzadorPedidos } from '../../core/seguimiento/lanzador-pedidos';
import { PanelError } from '../../shared/panel-error';

/** Identificador que no existe en Almacén: provoca StockNoDisponible con "el producto no existe". */
const PRODUCTO_INEXISTENTE = '99999999-9999-9999-9999-999999999999';

type FormularioLinea = FormGroup<{
  productoId: FormControl<string>;
  cantidad: FormControl<number>;
  precioUnitario: FormControl<number>;
}>;

/**
 * Formulario para componer un pedido a medida. Permite desactivar la validación del navegador para
 * comprobar cómo responde el backend (HTTP 400 con ValidationProblemDetails).
 */
@Component({
  selector: 'app-pedido-libre',
  imports: [ReactiveFormsModule, DecimalPipe, PanelError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">Pedido libre</h1>
      <p class="mt-2 max-w-3xl text-sm text-slate-600">
        Componga un pedido con cualquier combinación. Recuerde las reglas de la simulación: los importes de más de
        1.000 € se rechazan y un importe de exactamente 666,66 € provoca un fallo técnico en Pagos.
      </p>
    </section>

    <form [formGroup]="formulario" (ngSubmit)="enviar()" class="tarjeta max-w-4xl p-5">
      <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div>
          <label class="etiqueta" for="moneda">Moneda</label>
          <input id="moneda" class="campo font-mono uppercase" formControlName="moneda" maxlength="5" />
        </div>
      </div>

      <h2 class="mt-6 mb-2 font-semibold text-slate-900">Líneas</h2>
      <div formArrayName="lineas" class="space-y-3">
        @for (linea of lineas.controls; track linea; let indice = $index) {
          <div [formGroupName]="indice" class="grid items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_7rem_8rem_auto]">
            <div>
              <label class="etiqueta" [for]="'producto-' + indice">Producto</label>
              <select [id]="'producto-' + indice" class="campo" formControlName="productoId">
                @for (producto of catalogo; track producto.id) {
                  <option [value]="producto.id">{{ producto.nombre }} — {{ producto.papel }}</option>
                }
                <option [value]="productoInexistente">Producto inexistente (no está en el catálogo)</option>
              </select>
            </div>
            <div>
              <label class="etiqueta" [for]="'cantidad-' + indice">Cantidad</label>
              <input [id]="'cantidad-' + indice" type="number" class="campo text-right" formControlName="cantidad" />
            </div>
            <div>
              <label class="etiqueta" [for]="'precio-' + indice">Precio (€)</label>
              <input [id]="'precio-' + indice" type="number" step="0.01" class="campo text-right" formControlName="precioUnitario" />
            </div>
            <button type="button" class="boton-secundario" [disabled]="lineas.length === 1" (click)="quitarLinea(indice)" aria-label="Quitar línea">✕</button>
          </div>
        }
      </div>

      <button type="button" class="boton-secundario mt-3" (click)="agregarLinea()">+ Añadir línea</button>

      <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
        <div class="space-y-2">
          <p class="text-sm text-slate-600">Total <strong class="text-lg text-slate-900">{{ total() | number: '1.2-2' }} €</strong></p>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" class="size-4 accent-indigo-600" [checked]="validarEnNavegador()" (change)="validarEnNavegador.set(!validarEnNavegador())" />
            Validar en el navegador
            <span class="text-xs text-slate-400">(desactívelo para ver la validación del backend)</span>
          </label>
        </div>
        <button type="submit" class="boton-primario" [disabled]="enviando() || (validarEnNavegador() && !formularioValido())">
          {{ enviando() ? 'Enviando…' : 'Crear pedido' }}
        </button>
      </div>

      @if (error(); as detalleError) {
        <div class="mt-5"><app-panel-error [error]="detalleError" /></div>
      }
    </form>
  `,
})
export class PedidoLibre {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly lanzador = inject(LanzadorPedidos);
  private readonly router = inject(Router);

  protected readonly catalogo = CATALOGO_DEMOSTRACION;
  protected readonly productoInexistente = PRODUCTO_INEXISTENTE;

  protected readonly formulario = this.fb.group({
    moneda: this.fb.control('EUR', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]),
    lineas: this.fb.array<FormularioLinea>([this.crearLinea()]),
  });

  protected readonly validarEnNavegador = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<ErrorApi | null>(null);

  private readonly valor = toSignal(this.formulario.valueChanges, { initialValue: this.formulario.getRawValue() });
  private readonly estadoFormulario = toSignal(this.formulario.statusChanges, { initialValue: this.formulario.status });

  protected readonly formularioValido = computed(() => this.estadoFormulario() === 'VALID');
  protected readonly total = computed(() =>
    (this.valor().lineas ?? []).reduce((suma, linea) => suma + (linea.cantidad ?? 0) * (linea.precioUnitario ?? 0), 0),
  );

  protected get lineas(): FormArray<FormularioLinea> {
    return this.formulario.controls.lineas;
  }

  protected agregarLinea(): void {
    this.lineas.push(this.crearLinea());
  }

  protected quitarLinea(indice: number): void {
    this.lineas.removeAt(indice);
  }

  protected enviar(): void {
    if (this.validarEnNavegador() && this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { moneda, lineas } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.error.set(null);

    this.lanzador
      .lanzar({ lineas: lineas as LineaPedidoPeticion[], moneda, etiqueta: 'Pedido libre' })
      .subscribe({
        next: ({ pedido }) => this.router.navigate(['/pedidos', pedido.pedidoId]),
        error: (error: unknown) => {
          this.error.set(traducirError(error));
          this.enviando.set(false);
        },
      });
  }

  private crearLinea(): FormularioLinea {
    const [primero] = CATALOGO_DEMOSTRACION;
    return this.fb.group({
      productoId: this.fb.control(primero.id, Validators.required),
      cantidad: this.fb.control(1, [Validators.required, Validators.min(1), Validators.max(1000)]),
      precioUnitario: this.fb.control(primero.precioSugerido, [Validators.required, Validators.min(0.01)]),
    });
  }
}
